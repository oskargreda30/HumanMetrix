import { describe, it, expect } from 'vitest';
import {
  EMAIL_REGEX,
  NAME_REGEX,
  PHONE_REGEX,
  emailSchema,
  nameSchema,
  phoneSchema,
  passwordSchema,
  companyNameSchema,
  urlSchema,
  isValidEmail,
  isValidName,
  normalizeEmail,
  detectEmailTypo,
} from '@shared/validation';

describe('shared/validation', () => {
  describe('EMAIL_REGEX', () => {
    it('matches valid emails', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com',
        'email@subdomain.domain.com',
        'user123@test.io',
        'a@b.co',
      ];
      for (const email of validEmails) {
        expect(EMAIL_REGEX.test(email), `Expected "${email}" to be valid`).toBe(true);
      }
    });

    it('rejects invalid emails', () => {
      const invalidEmails = [
        '',
        'plaintext',
        '@no-local.com',
        'no-at-sign',
        'user@',
        'user@.com',
        'user@domain.',
        'user@@domain.com',
      ];
      for (const email of invalidEmails) {
        expect(EMAIL_REGEX.test(email), `Expected "${email}" to be invalid`).toBe(false);
      }
    });
  });

  describe('NAME_REGEX', () => {
    it('matches valid names', () => {
      const validNames = [
        'John',
        'Jane Doe',
        "O'Brien",
        'José García',
        'Mary-Jane',
        'Dr. Smith',
        'Nguyễn Văn',
        'A',
      ];
      for (const name of validNames) {
        expect(NAME_REGEX.test(name), `Expected "${name}" to be valid`).toBe(true);
      }
    });

    it('rejects invalid names', () => {
      const invalidNames = [
        '',
        '123',
        'user@name',
        'name!',
        '<script>',
        'a'.repeat(101),
      ];
      for (const name of invalidNames) {
        expect(NAME_REGEX.test(name), `Expected "${name}" to be invalid`).toBe(false);
      }
    });
  });

  describe('PHONE_REGEX', () => {
    it('matches valid phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567',
        '+44 20 7946 0958',
        '(555) 123-4567',
        '+63 912 345 6789',
        '09123456789',
      ];
      for (const phone of validPhones) {
        expect(PHONE_REGEX.test(phone), `Expected "${phone}" to be valid`).toBe(true);
      }
    });

    it('rejects invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123',
        'abcdefgh',
        '++1234567890',
        '1'.repeat(21),
      ];
      for (const phone of invalidPhones) {
        expect(PHONE_REGEX.test(phone), `Expected "${phone}" to be invalid`).toBe(false);
      }
    });
  });

  describe('emailSchema', () => {
    it('accepts valid email', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true);
    });

    it('rejects invalid email', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(emailSchema.safeParse('').success).toBe(false);
    });
  });

  describe('nameSchema', () => {
    it('accepts valid name', () => {
      expect(nameSchema.safeParse('John Doe').success).toBe(true);
    });

    it('rejects empty string', () => {
      expect(nameSchema.safeParse('').success).toBe(false);
    });

    it('rejects name with invalid characters', () => {
      expect(nameSchema.safeParse('User<123>').success).toBe(false);
    });
  });

  describe('phoneSchema', () => {
    it('accepts valid phone', () => {
      expect(phoneSchema.safeParse('+1234567890').success).toBe(true);
    });

    it('accepts empty string (optional)', () => {
      expect(phoneSchema.safeParse('').success).toBe(true);
    });

    it('accepts undefined (optional)', () => {
      expect(phoneSchema.safeParse(undefined).success).toBe(true);
    });

    it('rejects too short phone', () => {
      expect(phoneSchema.safeParse('123').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts password with 6+ characters', () => {
      expect(passwordSchema.safeParse('password').success).toBe(true);
    });

    it('rejects password shorter than 6 characters', () => {
      expect(passwordSchema.safeParse('12345').success).toBe(false);
    });

    it('rejects empty string', () => {
      expect(passwordSchema.safeParse('').success).toBe(false);
    });
  });

  describe('companyNameSchema', () => {
    it('accepts valid company name', () => {
      expect(companyNameSchema.safeParse('Acme Corp').success).toBe(true);
    });

    it('rejects empty string', () => {
      expect(companyNameSchema.safeParse('').success).toBe(false);
    });

    it('rejects name exceeding 200 characters', () => {
      expect(companyNameSchema.safeParse('A'.repeat(201)).success).toBe(false);
    });
  });

  describe('urlSchema', () => {
    it('accepts valid URL', () => {
      expect(urlSchema.safeParse('https://example.com').success).toBe(true);
    });

    it('accepts empty string (optional)', () => {
      expect(urlSchema.safeParse('').success).toBe(true);
    });

    it('accepts undefined (optional)', () => {
      expect(urlSchema.safeParse(undefined).success).toBe(true);
    });

    it('rejects invalid URL', () => {
      expect(urlSchema.safeParse('not-a-url').success).toBe(false);
    });
  });

  describe('isValidEmail()', () => {
    it('returns true for valid email', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
    });

    it('returns false for invalid email', () => {
      expect(isValidEmail('not-email')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(isValidEmail('  user@example.com  ')).toBe(true);
    });
  });

  describe('isValidName()', () => {
    it('returns true for valid name', () => {
      expect(isValidName('John Doe')).toBe(true);
    });

    it('returns false for invalid name', () => {
      expect(isValidName('123!')).toBe(false);
    });

    it('trims whitespace before validating', () => {
      expect(isValidName('  John  ')).toBe(true);
    });
  });

  describe('normalizeEmail()', () => {
    it('lowercases email', () => {
      expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('trims whitespace', () => {
      expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('handles already normalized email', () => {
      expect(normalizeEmail('user@example.com')).toBe('user@example.com');
    });
  });

  describe('detectEmailTypo()', () => {
    it('detects gmial.com typo', () => {
      const result = detectEmailTypo('user@gmial.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
      expect(result.typoType).toBe('domain');
    });

    it('detects gmal.com typo', () => {
      const result = detectEmailTypo('user@gmal.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects gmaill.com typo', () => {
      const result = detectEmailTypo('user@gmaill.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects gmali.com typo', () => {
      const result = detectEmailTypo('user@gmali.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects gmail.co typo', () => {
      const result = detectEmailTypo('user@gmail.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects gmail.con typo', () => {
      const result = detectEmailTypo('user@gmail.con');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects gmai.com typo', () => {
      const result = detectEmailTypo('user@gmai.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('detects hotmal.com typo', () => {
      const result = detectEmailTypo('user@hotmal.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@hotmail.com');
    });

    it('detects hotmai.com typo', () => {
      const result = detectEmailTypo('user@hotmai.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@hotmail.com');
    });

    it('detects hotmail.co typo', () => {
      const result = detectEmailTypo('user@hotmail.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@hotmail.com');
    });

    it('detects hotmail.con typo', () => {
      const result = detectEmailTypo('user@hotmail.con');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@hotmail.com');
    });

    it('detects outloo.com typo', () => {
      const result = detectEmailTypo('user@outloo.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@outlook.com');
    });

    it('detects outlok.com typo', () => {
      const result = detectEmailTypo('user@outlok.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@outlook.com');
    });

    it('detects outlook.co typo', () => {
      const result = detectEmailTypo('user@outlook.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@outlook.com');
    });

    it('detects yahoo.co typo', () => {
      const result = detectEmailTypo('user@yahoo.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@yahoo.com');
    });

    it('detects yahoo.con typo', () => {
      const result = detectEmailTypo('user@yahoo.con');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@yahoo.com');
    });

    it('detects yaho.com typo', () => {
      const result = detectEmailTypo('user@yaho.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@yahoo.com');
    });

    it('detects yahooo.com typo', () => {
      const result = detectEmailTypo('user@yahooo.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@yahoo.com');
    });

    it('detects icloud.co typo', () => {
      const result = detectEmailTypo('user@icloud.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@icloud.com');
    });

    it('detects icould.com typo', () => {
      const result = detectEmailTypo('user@icould.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@icloud.com');
    });

    it('detects protonmail.co typo', () => {
      const result = detectEmailTypo('user@protonmail.co');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@protonmail.com');
    });

    it('detects protonmal.com typo', () => {
      const result = detectEmailTypo('user@protonmal.com');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@protonmail.com');
    });

    it('returns no typo for correct gmail.com', () => {
      const result = detectEmailTypo('user@gmail.com');
      expect(result.hasTypo).toBe(false);
    });

    it('handles empty string', () => {
      const result = detectEmailTypo('');
      expect(result.hasTypo).toBe(false);
    });

    it('handles string without @', () => {
      const result = detectEmailTypo('noemail');
      expect(result.hasTypo).toBe(false);
    });

    it('handles multiple @ signs', () => {
      const result = detectEmailTypo('user@domain@extra.com');
      expect(result.hasTypo).toBe(false);
    });

    it('is case-insensitive', () => {
      const result = detectEmailTypo('User@GMIAL.COM');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });

    it('trims whitespace', () => {
      const result = detectEmailTypo('  user@gmial.com  ');
      expect(result.hasTypo).toBe(true);
      expect(result.suggestedEmail).toBe('user@gmail.com');
    });
  });
});
