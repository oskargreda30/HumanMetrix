/**
 * Test Fixtures and Factory Functions
 * 
 * Provides reusable test data generators for consistent testing across the application.
 */

import { randomUUID } from 'crypto';

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'super_admin';
  passwordHash: string;
  createdAt: Date;
  resultsConsentGranted?: boolean;
}

export interface MockPartner {
  id: string;
  name: string;
  companyName: string;
  email: string;
  isActive: boolean;
  billingType: 'prepaid' | 'auto_bill' | 'invoice';
  prepaidBalance: number;
  currentMonthUsage: number;
  pricePerAssessment: number;
  monthlyQuota: number;
}

export interface MockApiKey {
  id: string;
  partnerId: string;
  keyPrefix: string;
  keyHash: string;
  permissions: string[];
  isActive: boolean;
  rateLimit: number;
  rateLimitWindow: number;
}

export interface MockAssessmentSession {
  id: string;
  partnerId: string;
  apiKeyId: string;
  assessmentType: 'fit' | 'ai_readiness' | 'prompt_architecture' | 'aiq';
  status: 'created' | 'started' | 'completed' | 'expired';
  externalUserId?: string;
  externalEmail?: string;
  answers?: Record<string, any>;
  scores?: Record<string, number>;
  totalScore?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  expiresAt: Date;
}

export interface MockInvitation {
  id: string;
  email: string;
  assessmentTypes: string[];
  status: 'pending' | 'sent' | 'accepted' | 'expired';
  invitedBy: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface MockPurchase {
  id: string;
  userId: string;
  assessmentTypes: string[];
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'cancelled' | 'failed';
  stripePaymentIntentId?: string;
  createdAt: Date;
}

export interface MockResult {
  id: string;
  sessionId: string;
  userId?: string;
  assessmentType: string;
  scores: Record<string, number>;
  totalScore: number;
  status: 'pending' | 'completed';
  createdAt: Date;
}

// Factory functions
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: randomUUID(),
    email: `test-${Date.now()}@example.com`,
    name: 'Test User',
    role: 'user',
    passwordHash: '$2a$10$mockHashedPassword',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    role: 'admin',
    name: 'Admin User',
    email: `admin-${Date.now()}@example.com`,
    ...overrides,
  });
}

export function createMockSuperAdmin(overrides: Partial<MockUser> = {}): MockUser {
  return createMockUser({
    role: 'super_admin',
    name: 'Super Admin',
    email: `superadmin-${Date.now()}@example.com`,
    ...overrides,
  });
}

export function createMockPartner(overrides: Partial<MockPartner> = {}): MockPartner {
  return {
    id: randomUUID(),
    name: 'Test Partner',
    companyName: 'Test Company Ltd',
    email: `partner-${Date.now()}@example.com`,
    isActive: true,
    billingType: 'prepaid',
    prepaidBalance: 100,
    currentMonthUsage: 0,
    pricePerAssessment: 500,
    monthlyQuota: 100,
    ...overrides,
  };
}

export function createMockApiKey(partnerId: string, overrides: Partial<MockApiKey> = {}): MockApiKey {
  return {
    id: randomUUID(),
    partnerId,
    keyPrefix: 'hm_test',
    keyHash: 'hashed-key-value',
    permissions: ['assessments:write', 'assessments:read', 'results:read'],
    isActive: true,
    rateLimit: 100,
    rateLimitWindow: 3600,
    ...overrides,
  };
}

export function createMockSession(
  partnerId: string,
  apiKeyId: string,
  overrides: Partial<MockAssessmentSession> = {}
): MockAssessmentSession {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setHours(expiresAt.getHours() + 24);

  return {
    id: randomUUID(),
    partnerId,
    apiKeyId,
    assessmentType: 'fit',
    status: 'created',
    createdAt: now,
    expiresAt,
    ...overrides,
  };
}

export function createMockInvitation(invitedBy: string, overrides: Partial<MockInvitation> = {}): MockInvitation {
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + 7);

  return {
    id: randomUUID(),
    email: `invited-${Date.now()}@example.com`,
    assessmentTypes: ['fit', 'ai_readiness'],
    status: 'pending',
    invitedBy,
    token: randomUUID(),
    expiresAt,
    createdAt: now,
    ...overrides,
  };
}

export function createMockPurchase(userId: string, overrides: Partial<MockPurchase> = {}): MockPurchase {
  return {
    id: randomUUID(),
    userId,
    assessmentTypes: ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'],
    amount: 1999,
    currency: 'gbp',
    status: 'pending',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockResult(
  sessionId: string,
  assessmentType: string,
  overrides: Partial<MockResult> = {}
): MockResult {
  return {
    id: randomUUID(),
    sessionId,
    assessmentType,
    scores: {
      dimension1: 75,
      dimension2: 82,
      dimension3: 68,
    },
    totalScore: 75,
    status: 'completed',
    createdAt: new Date(),
    ...overrides,
  };
}

// Assessment answer generators
export function generateFITAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  for (let i = 0; i < 25; i++) {
    answers[`q${i}`] = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
  }
  return answers;
}

export function generateAIReadinessAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  for (let i = 0; i < 25; i++) {
    answers[`q${i}`] = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
  }
  return answers;
}

export function generatePromptArchitectureAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  for (let i = 0; i < 7; i++) {
    answers[`level${i}`] = `This is a sample prompt response for level ${i}. It contains enough text to pass validation requirements and demonstrates the candidate's understanding of the prompt engineering concepts.`;
  }
  return answers;
}

export function generateAIQAnswers(): Record<string, string> {
  const answers: Record<string, string> = {};
  for (let i = 0; i < 8; i++) {
    answers[`q${i}`] = ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)];
  }
  return answers;
}

// Email validation helper
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// UUID validation helper
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}
