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
 * Generate a random temporary password
 * Format: 3 words + 2 digits (e.g., "sky-blue-moon-42")
 */
export function generateTemporaryPassword(): string {
  const words = [
    "ocean", "mountain", "forest", "river", "cloud",
    "storm", "dawn", "sunset", "moon", "star",
    "wind", "rain", "snow", "fire", "earth",
    "sky", "wave", "thunder", "lightning", "rainbow"
  ];
  
  const word1 = words[Math.floor(Math.random() * words.length)];
  const word2 = words[Math.floor(Math.random() * words.length)];
  const word3 = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  
  return `${word1}-${word2}-${word3}-${digits}`;
}

/**
 * Generate a secure random reset token
 */
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
