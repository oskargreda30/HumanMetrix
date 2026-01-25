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
