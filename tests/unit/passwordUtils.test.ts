import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, generateTemporaryPassword, generateResetToken } from '../../server/passwordUtils';

describe('passwordUtils', () => {
  describe('hashPassword', () => {
    it('produces a bcrypt hash', async () => {
      const hash = await hashPassword('testPassword123');
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$.{53}$/);
    });

    it('produces different hashes for the same password', async () => {
      const hash1 = await hashPassword('samePassword');
      const hash2 = await hashPassword('samePassword');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for correct password', async () => {
      const password = 'correctPassword';
      const hash = await hashPassword(password);
      const result = await verifyPassword(password, hash);
      expect(result).toBe(true);
    });

    it('returns false for incorrect password', async () => {
      const hash = await hashPassword('correctPassword');
      const result = await verifyPassword('wrongPassword', hash);
      expect(result).toBe(false);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('starts with "HMx-"', () => {
      const password = generateTemporaryPassword();
      expect(password.startsWith('HMx-')).toBe(true);
    });

    it('has correct length (HMx- prefix + 22 base64url chars)', () => {
      const password = generateTemporaryPassword();
      expect(password.length).toBe(4 + 22);
    });

    it('produces different values on different calls', () => {
      const p1 = generateTemporaryPassword();
      const p2 = generateTemporaryPassword();
      expect(p1).not.toBe(p2);
    });
  });

  describe('generateResetToken', () => {
    it('produces a hex string of 64 characters', () => {
      const token = generateResetToken();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('has exactly 64 characters', () => {
      const token = generateResetToken();
      expect(token.length).toBe(64);
    });

    it('produces different values on different calls', () => {
      const t1 = generateResetToken();
      const t2 = generateResetToken();
      expect(t1).not.toBe(t2);
    });
  });
});
