export const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^`{|}~_-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const NAME_REGEX = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\-'.&,()]{1,100}$/;

export const PHONE_REGEX = /^\+?[0-9\s\-().]{7,20}$/;

export const PASSWORD_REGEX = /^.{6,}$/;

export const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const COMPANY_NAME_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\-'.&,()]{1,200}$/;

export const ROLE_TITLE_REGEX = /^[a-zA-Z0-9À-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\s\-'.&,()\/]{1,150}$/;

export const PROMO_CODE_REGEX = /^[A-Z0-9_-]{2,30}$/i;

export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim());
}

export function isValidName(name: string): boolean {
  return NAME_REGEX.test(name.trim());
}

export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone.trim());
}

export function isValidPassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}

export function isValidUrl(url: string): boolean {
  return URL_REGEX.test(url.trim());
}

export function isValidCompanyName(name: string): boolean {
  return COMPANY_NAME_REGEX.test(name.trim());
}

export function isValidRoleTitle(title: string): boolean {
  return ROLE_TITLE_REGEX.test(title.trim());
}

export function isValidPromoCode(code: string): boolean {
  return PROMO_CODE_REGEX.test(code.trim());
}

export function getEmailError(email: string): string | null {
  if (!email.trim()) return "Email is required";
  if (!isValidEmail(email)) return "Please enter a valid email address";
  return null;
}

export function getNameError(name: string, fieldName: string = "Name"): string | null {
  if (!name.trim()) return `${fieldName} is required`;
  if (!isValidName(name)) return `${fieldName} contains invalid characters`;
  return null;
}

export function getPhoneError(phone: string): string | null {
  if (!phone.trim()) return null;
  if (!isValidPhone(phone)) return "Please enter a valid phone number";
  return null;
}

export function getPasswordError(password: string): string | null {
  if (!password) return "Password is required";
  if (password.length < 6) return "Password must be at least 6 characters";
  return null;
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
