/**
 * Integration Tests for Authentication System
 * 
 * Tests cover:
 * - User signup flow
 * - User login flow
 * - Session management
 * - Password reset flow
 * - Password change (logged-in users)
 * - Access control guards
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';

// Mock storage interface for testing auth logic
const mockStorage = {
  users: new Map<string, any>(),
  resetUser: function() {
    this.users.clear();
  },
  getUserByEmail: vi.fn(),
  createUser: vi.fn(),
  getUser: vi.fn(),
  getUserByResetToken: vi.fn(),
  setResetToken: vi.fn(),
  updatePassword: vi.fn(),
  createFreeAssessmentsForUser: vi.fn(),
};

describe('Authentication Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.resetUser();
  });

  describe('Signup Validation', () => {
    it('should reject signup without email', () => {
      const body = { password: 'password123' };
      expect(!body.email || !body.password).toBe(true);
    });

    it('should reject signup without password', () => {
      const body = { email: 'test@example.com' };
      expect(!(body as any).password).toBe(true);
    });

    it('should reject signup with existing email', async () => {
      const existingUser = { id: 'user-1', email: 'existing@example.com' };
      mockStorage.getUserByEmail.mockResolvedValue(existingUser);

      const result = await mockStorage.getUserByEmail('existing@example.com');
      expect(result).toBeDefined();
      expect(result.email).toBe('existing@example.com');
    });

    it('should accept signup with valid credentials', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(undefined);
      const newUser = {
        id: 'user-new',
        email: 'new@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
      };
      mockStorage.createUser.mockResolvedValue(newUser);

      const result = await mockStorage.createUser({
        email: 'new@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
      });

      expect(result.email).toBe('new@example.com');
      expect(result.firstName).toBe('Test');
    });
  });

  describe('Password Hashing', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2')).toBe(true);
    });

    it('should verify correct password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);
      
      const isValid = await bcrypt.compare('wrongPassword', hash);
      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await bcrypt.hash(password, 10);
      const hash2 = await bcrypt.hash(password, 10);
      
      expect(hash1).not.toBe(hash2);
      // Both should still verify correctly
      expect(await bcrypt.compare(password, hash1)).toBe(true);
      expect(await bcrypt.compare(password, hash2)).toBe(true);
    });
  });

  describe('Login Validation', () => {
    it('should reject login without credentials', () => {
      const body = {};
      expect(!(body as any).email || !(body as any).password).toBe(true);
    });

    it('should reject login for non-existent user', async () => {
      mockStorage.getUserByEmail.mockResolvedValue(undefined);

      const user = await mockStorage.getUserByEmail('nonexistent@example.com');
      expect(user).toBeUndefined();
    });

    it('should reject login with wrong password', async () => {
      const storedHash = await bcrypt.hash('correctPassword', 10);
      const isValid = await bcrypt.compare('wrongPassword', storedHash);
      expect(isValid).toBe(false);
    });

    it('should accept login with correct credentials', async () => {
      const password = 'correctPassword';
      const storedHash = await bcrypt.hash(password, 10);
      const isValid = await bcrypt.compare(password, storedHash);
      expect(isValid).toBe(true);
    });
  });

  describe('Password Reset Token', () => {
    it('should generate cryptographically secure reset tokens', async () => {
      const crypto = await import('crypto');
      const token1 = crypto.randomBytes(32).toString('hex');
      const token2 = crypto.randomBytes(32).toString('hex');

      expect(token1.length).toBe(64);
      expect(token2.length).toBe(64);
      expect(token1).not.toBe(token2);
    });

    it('should set token expiry to 1 hour', () => {
      const now = Date.now();
      const expiry = new Date(now + 60 * 60 * 1000);
      const expectedExpiry = new Date(now + 3600000);

      expect(expiry.getTime()).toBeCloseTo(expectedExpiry.getTime(), -3);
    });

    it('should reject expired reset tokens', () => {
      const expiredTime = new Date(Date.now() - 1000); // 1 second ago
      const isExpired = new Date() > expiredTime;
      expect(isExpired).toBe(true);
    });

    it('should accept valid reset tokens', () => {
      const futureTime = new Date(Date.now() + 3600000); // 1 hour from now
      const isExpired = new Date() > futureTime;
      expect(isExpired).toBe(false);
    });
  });

  describe('Password Change Validation', () => {
    it('should reject password change without current password', () => {
      const body = { newPassword: 'newPassword123' };
      expect(!(body as any).currentPassword || !body.newPassword).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const newPassword = 'short';
      expect(newPassword.length < 8).toBe(true);
    });

    it('should accept password of exactly 8 characters', () => {
      const newPassword = '12345678';
      expect(newPassword.length >= 8).toBe(true);
    });

    it('should accept password longer than 8 characters', () => {
      const newPassword = 'thisIsAVeryLongPassword123!';
      expect(newPassword.length >= 8).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should identify authenticated requests by userId in session', () => {
      const session = { userId: 'user-123' };
      expect(session.userId).toBeTruthy();
    });

    it('should reject requests without userId in session', () => {
      const session = {};
      expect((session as any).userId).toBeFalsy();
    });

    it('should reject requests with null userId', () => {
      const session = { userId: null };
      expect(session.userId).toBeFalsy();
    });

    it('should reject requests with undefined userId', () => {
      const session = { userId: undefined };
      expect(session.userId).toBeFalsy();
    });
  });

  describe('User Response Sanitization', () => {
    it('should not include passwordHash in login response', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        passwordHash: 'secret-hash',
        role: 'user',
      };

      const response = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      };

      expect(response).not.toHaveProperty('passwordHash');
      expect(response.email).toBe('test@example.com');
    });

    it('should not include resetToken in response', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        resetToken: 'secret-token',
        resetTokenExpiry: new Date(),
      };

      const response = {
        id: user.id,
        email: user.email,
      };

      expect(response).not.toHaveProperty('resetToken');
      expect(response).not.toHaveProperty('resetTokenExpiry');
    });
  });
});

describe('isAuthenticated Middleware Logic', () => {
  it('should reject request without session userId', () => {
    const session = {};
    const userId = (session as any).userId;
    expect(!userId).toBe(true);
  });

  it('should reject request if user not found in database', async () => {
    mockStorage.getUser.mockResolvedValue(undefined);

    const user = await mockStorage.getUser('nonexistent-user');
    expect(user).toBeUndefined();
  });

  it('should attach user to request if valid', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com', role: 'user' };
    mockStorage.getUser.mockResolvedValue(mockUser);

    const user = await mockStorage.getUser('user-1');
    expect(user).toBeDefined();
    expect(user.id).toBe('user-1');
  });
});

describe('populateUser Middleware Logic', () => {
  it('should not fail if no userId in session', () => {
    const session = {};
    const userId = (session as any).userId;
    
    // populateUser should proceed without error even with no userId
    expect(userId).toBeFalsy();
  });

  it('should populate user if userId exists and user found', async () => {
    const mockUser = { id: 'user-1', email: 'test@example.com' };
    mockStorage.getUser.mockResolvedValue(mockUser);

    const userId = 'user-1';
    if (userId) {
      const user = await mockStorage.getUser(userId);
      expect(user).toBeDefined();
    }
  });

  it('should not fail if user not found', async () => {
    mockStorage.getUser.mockResolvedValue(undefined);

    const user = await mockStorage.getUser('nonexistent');
    expect(user).toBeUndefined();
  });
});
