import { z } from "zod";

export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^`{|}~_-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\-'.&,()]{1,100}$/;

export const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export const emailSchema = z.string().regex(EMAIL_REGEX, "Invalid email format");

export const nameSchema = z.string().min(1, "Name is required").regex(NAME_REGEX, "Name contains invalid characters");

export const phoneSchema = z.string().regex(PHONE_REGEX, "Invalid phone number").optional().or(z.literal(""));

export const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export const companyNameSchema = z.string().min(1, "Company name is required").max(200);

export const urlSchema = z.string().url("Invalid URL").optional().or(z.literal(""));

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidName(name: string): boolean {
  return NAME_REGEX.test(name.trim());
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Common email domain typos and their corrections
const EMAIL_DOMAIN_TYPOS: Record<string, string> = {
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

export interface EmailTypoSuggestion {
  hasTypo: boolean;
  suggestedEmail?: string;
  typoType?: 'domain' | 'format';
}

export function detectEmailTypo(email: string): EmailTypoSuggestion {
  if (!email || !email.includes('@')) {
    return { hasTypo: false };
  }
  
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) {
    return { hasTypo: false };
  }
  
  const [localPart, domain] = parts;
  
  // Check for known domain typos
  if (EMAIL_DOMAIN_TYPOS[domain]) {
    return {
      hasTypo: true,
      suggestedEmail: `${localPart}@${EMAIL_DOMAIN_TYPOS[domain]}`,
      typoType: 'domain'
    };
  }
  
  return { hasTypo: false };
}
