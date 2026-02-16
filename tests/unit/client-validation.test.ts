import { describe, it, expect } from 'vitest';
import {
  EMAIL_REGEX,
  NAME_REGEX,
  PHONE_REGEX,
  PASSWORD_REGEX,
  URL_REGEX,
  UUID_REGEX,
  COMPANY_NAME_REGEX,
  ROLE_TITLE_REGEX,
  PROMO_CODE_REGEX,
  isValidEmail,
  isValidName,
  isValidPhone,
  isValidPassword,
  isValidUrl,
  isValidCompanyName,
  isValidRoleTitle,
  isValidPromoCode,
  getEmailError,
  getNameError,
  getPhoneError,
  getPasswordError,
  detectEmailTypo,
} from '@/lib/validation';

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('test.user@domain.co')).toBe(true);
    expect(isValidEmail('name+tag@sub.domain.org')).toBe(true);
    expect(isValidEmail('a@b.co')).toBe(true);
  });

  it('rejects emails without @', () => {
    expect(isValidEmail('userexample.com')).toBe(false);
  });

  it('rejects emails without domain', () => {
    expect(isValidEmail('user@')).toBe(false);
    expect(isValidEmail('user@.')).toBe(false);
  });

  it('rejects emails with spaces', () => {
    expect(isValidEmail('user @example.com')).toBe(false);
    expect(isValidEmail('user@ example.com')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('trims whitespace before validation', () => {
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });
});

describe('isValidName', () => {
  it('accepts letters', () => {
    expect(isValidName('John Doe')).toBe(true);
  });

  it('accepts accented characters', () => {
    expect(isValidName('José García')).toBe(true);
    expect(isValidName('François Müller')).toBe(true);
  });

  it('accepts special chars (.\'- )', () => {
    expect(isValidName("O'Brien")).toBe(true);
    expect(isValidName('Mary-Jane')).toBe(true);
    expect(isValidName('Dr. Smith')).toBe(true);
  });

  it('rejects invalid characters', () => {
    expect(isValidName('John@Doe')).toBe(false);
    expect(isValidName('Name123')).toBe(false);
    expect(isValidName('Test!')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidName('')).toBe(false);
  });

  it('rejects string exceeding 100 chars', () => {
    expect(isValidName('A'.repeat(101))).toBe(false);
  });

  it('accepts string of exactly 100 chars', () => {
    expect(isValidName('A'.repeat(100))).toBe(true);
  });
});

describe('isValidPhone', () => {
  it('accepts phone with country code', () => {
    expect(isValidPhone('+1 555-123-4567')).toBe(true);
    expect(isValidPhone('+44 20 7946 0958')).toBe(true);
  });

  it('accepts phone without country code', () => {
    expect(isValidPhone('555-123-4567')).toBe(true);
    expect(isValidPhone('(555) 123-4567')).toBe(true);
  });

  it('accepts various formats', () => {
    expect(isValidPhone('5551234567')).toBe(true);
    expect(isValidPhone('555.123.4567')).toBe(true);
  });

  it('rejects too short numbers', () => {
    expect(isValidPhone('12345')).toBe(false);
  });

  it('rejects letters', () => {
    expect(isValidPhone('555-ABC-1234')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('rejects passwords shorter than 6', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('abc')).toBe(false);
  });

  it('accepts password of exactly 6 characters', () => {
    expect(isValidPassword('123456')).toBe(true);
  });

  it('accepts longer passwords', () => {
    expect(isValidPassword('mySecurePassword123!')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

describe('isValidUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  it('accepts https URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true);
    expect(isValidUrl('https://sub.domain.com/path?q=1')).toBe(true);
  });

  it('rejects URLs without protocol', () => {
    expect(isValidUrl('example.com')).toBe(false);
    expect(isValidUrl('www.example.com')).toBe(false);
  });

  it('rejects invalid URLs', () => {
    expect(isValidUrl('')).toBe(false);
    expect(isValidUrl('ftp://example.com')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('isValidCompanyName', () => {
  it('accepts valid company names', () => {
    expect(isValidCompanyName('Acme Corp')).toBe(true);
    expect(isValidCompanyName("O'Reilly & Associates")).toBe(true);
    expect(isValidCompanyName('Company 123')).toBe(true);
  });

  it('rejects names exceeding 200 chars', () => {
    expect(isValidCompanyName('A'.repeat(201))).toBe(false);
  });

  it('accepts names of exactly 200 chars', () => {
    expect(isValidCompanyName('A'.repeat(200))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidCompanyName('')).toBe(false);
  });
});

describe('isValidRoleTitle', () => {
  it('accepts valid titles', () => {
    expect(isValidRoleTitle('Software Engineer')).toBe(true);
    expect(isValidRoleTitle('VP of Engineering')).toBe(true);
  });

  it('accepts titles with slashes', () => {
    expect(isValidRoleTitle('Designer/Developer')).toBe(true);
    expect(isValidRoleTitle('AI/ML Engineer')).toBe(true);
  });

  it('rejects titles exceeding 150 chars', () => {
    expect(isValidRoleTitle('A'.repeat(151))).toBe(false);
  });

  it('accepts titles of exactly 150 chars', () => {
    expect(isValidRoleTitle('A'.repeat(150))).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidRoleTitle('')).toBe(false);
  });
});

describe('isValidPromoCode', () => {
  it('accepts valid codes with A-Z, 0-9, _, -', () => {
    expect(isValidPromoCode('SAVE20')).toBe(true);
    expect(isValidPromoCode('CODE_2024')).toBe(true);
    expect(isValidPromoCode('WINTER-SALE')).toBe(true);
  });

  it('accepts lowercase (case-insensitive regex)', () => {
    expect(isValidPromoCode('save20')).toBe(true);
  });

  it('rejects too short codes (< 2 chars)', () => {
    expect(isValidPromoCode('A')).toBe(false);
  });

  it('accepts codes of exactly 2 chars', () => {
    expect(isValidPromoCode('AB')).toBe(true);
  });

  it('rejects codes with special characters', () => {
    expect(isValidPromoCode('CODE@50')).toBe(false);
    expect(isValidPromoCode('SAVE 20')).toBe(false);
    expect(isValidPromoCode('CODE!')).toBe(false);
  });

  it('rejects codes exceeding 30 chars', () => {
    expect(isValidPromoCode('A'.repeat(31))).toBe(false);
  });
});

describe('getEmailError', () => {
  it('returns error for empty email', () => {
    expect(getEmailError('')).toBe('Email is required');
    expect(getEmailError('   ')).toBe('Email is required');
  });

  it('returns error for invalid email', () => {
    expect(getEmailError('invalid')).toBe('Please enter a valid email address');
  });

  it('returns null for valid email', () => {
    expect(getEmailError('user@example.com')).toBeNull();
  });
});

describe('getNameError', () => {
  it('returns error for empty name', () => {
    expect(getNameError('')).toBe('Name is required');
  });

  it('returns error for invalid chars', () => {
    expect(getNameError('Name123')).toBe('Name contains invalid characters');
  });

  it('returns null for valid name', () => {
    expect(getNameError('John Doe')).toBeNull();
  });

  it('uses custom field name', () => {
    expect(getNameError('', 'First Name')).toBe('First Name is required');
    expect(getNameError('Test!', 'Last Name')).toBe('Last Name contains invalid characters');
  });
});

describe('getPhoneError', () => {
  it('returns null for empty phone', () => {
    expect(getPhoneError('')).toBeNull();
    expect(getPhoneError('   ')).toBeNull();
  });

  it('returns error for invalid phone', () => {
    expect(getPhoneError('abc')).toBe('Please enter a valid phone number');
  });

  it('returns null for valid phone', () => {
    expect(getPhoneError('+1 555-123-4567')).toBeNull();
  });
});

describe('getPasswordError', () => {
  it('returns error for empty password', () => {
    expect(getPasswordError('')).toBe('Password is required');
  });

  it('returns error for too short password', () => {
    expect(getPasswordError('abc')).toBe('Password must be at least 6 characters');
  });

  it('returns null for valid password', () => {
    expect(getPasswordError('123456')).toBeNull();
    expect(getPasswordError('strongPassword!')).toBeNull();
  });
});

describe('UUID_REGEX', () => {
  it('matches valid UUIDs', () => {
    expect(UUID_REGEX.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(UUID_REGEX.test('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
    expect(UUID_REGEX.test('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });

  it('rejects invalid strings', () => {
    expect(UUID_REGEX.test('not-a-uuid')).toBe(false);
    expect(UUID_REGEX.test('550e8400e29b41d4a716446655440000')).toBe(false);
    expect(UUID_REGEX.test('')).toBe(false);
    expect(UUID_REGEX.test('550e8400-e29b-61d4-a716-446655440000')).toBe(false);
    expect(UUID_REGEX.test('gggggggg-gggg-1ggg-8ggg-gggggggggggg')).toBe(false);
  });
});

describe('detectEmailTypo', () => {
  it('detects all known domain typos', () => {
    const typos: Record<string, string> = {
      'gmial.com': 'gmail.com',
      'gmal.com': 'gmail.com',
      'gmaill.com': 'gmail.com',
      'gmali.com': 'gmail.com',
      'gmail.co': 'gmail.com',
      'gmail.con': 'gmail.com',
      'gmai.com': 'gmail.com',
      'hotmal.com': 'hotmail.com',
      'hotmai.com': 'hotmail.com',
      'hotmail.co': 'hotmail.com',
      'hotmail.con': 'hotmail.com',
      'outloo.com': 'outlook.com',
      'outlok.com': 'outlook.com',
      'outlook.co': 'outlook.com',
      'yahoo.co': 'yahoo.com',
      'yahoo.con': 'yahoo.com',
      'yaho.com': 'yahoo.com',
      'yahooo.com': 'yahoo.com',
      'icloud.co': 'icloud.com',
      'icould.com': 'icloud.com',
      'protonmail.co': 'protonmail.com',
      'protonmal.com': 'protonmail.com',
    };

    for (const [typo, correction] of Object.entries(typos)) {
      const result = detectEmailTypo(`user@${typo}`);
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe(`user@${correction}`);
      expect(result.typoType).toBe('domain');
    }
  });

  it('returns no typo for correct domains', () => {
    expect(detectEmailTypo('user@gmail.com')).toEqual({ hasTypo: false });
    expect(detectEmailTypo('user@outlook.com')).toEqual({ hasTypo: false });
    expect(detectEmailTypo('user@yahoo.com')).toEqual({ hasTypo: false });
  });

  it('handles edge cases', () => {
    expect(detectEmailTypo('')).toEqual({ hasTypo: false });
    expect(detectEmailTypo('no-at-sign')).toEqual({ hasTypo: false });
    expect(detectEmailTypo('user@company.io')).toEqual({ hasTypo: false });
  });

  it('lowercases email before checking', () => {
    const result = detectEmailTypo('User@GMIAL.COM');
    expect(result.hasTypo).toBe(true);
    expect(result.suggestedEmail).toBe('user@gmail.com');
  });
});
