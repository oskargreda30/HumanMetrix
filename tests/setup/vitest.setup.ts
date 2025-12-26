/**
 * Vitest Global Setup
 * 
 * This file runs before all tests and sets up the test environment.
 */

import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';

// Mock console methods to reduce noise during tests (optional)
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeAll(() => {
  // Suppress expected console warnings during tests
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

afterAll(() => {
  // Restore console methods
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
});
