import { describe, it, expect } from 'vitest';
import { isUnauthorizedError } from '../../client/src/lib/authUtils';

describe('client/src/lib/authUtils', () => {
  describe('isUnauthorizedError', () => {
    it('should return true for 401 Unauthorized error messages', () => {
      const error = new Error('401: Unauthorized');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('should return true when Unauthorized appears after 401:', () => {
      const error = new Error('401: Not Unauthorized access denied');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('should return true for 401 with description before Unauthorized', () => {
      const error = new Error('401: Session Unauthorized');
      expect(isUnauthorizedError(error)).toBe(true);
    });

    it('should return false for non-401 errors', () => {
      const error = new Error('403: Forbidden');
      expect(isUnauthorizedError(error)).toBe(false);
    });

    it('should return false for 500 errors', () => {
      const error = new Error('500: Internal Server Error');
      expect(isUnauthorizedError(error)).toBe(false);
    });

    it('should return false for generic error messages', () => {
      const error = new Error('Something went wrong');
      expect(isUnauthorizedError(error)).toBe(false);
    });

    it('should return false for empty error message', () => {
      const error = new Error('');
      expect(isUnauthorizedError(error)).toBe(false);
    });
  });
});
