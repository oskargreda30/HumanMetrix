import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a cryptographically secure random temporary password
 * Uses 16 bytes (128 bits) of entropy encoded in URL-safe base64
 * Format: HMx-[22 random characters] (e.g., "HMx-A7b9Kp2mNqRsT4vWxY")
 */
export function generateTemporaryPassword(): string {
  // 16 bytes = 128 bits of entropy (cryptographically strong)
  const randomBytes = crypto.randomBytes(16);
  // Use base64url encoding (URL-safe, no special characters)
  const encoded = randomBytes.toString('base64url');
  // Prefix with HMx- to make it clear this is a HumanMetrix temporary password
  return `HMx-${encoded}`;
}

/**
 * Generate a secure random reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
