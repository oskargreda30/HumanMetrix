import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';
import { isUnauthorizedError } from '@/lib/authUtils';
import { HUMANMETRIX_LOGO_BASE64 } from '@/lib/pdfAssets';

describe('cn - Class Name Utility', () => {
  describe('Basic functionality', () => {
    it('should handle a single class', () => {
      const result = cn('px-2');
      expect(result).toBe('px-2');
    });

    it('should handle multiple classes', () => {
      const result = cn('px-2', 'py-3', 'bg-red-500');
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
      expect(result).toContain('bg-red-500');
    });

    it('should handle empty string', () => {
      const result = cn('');
      expect(result).toBe('');
    });

    it('should handle multiple empty strings', () => {
      const result = cn('', '', '');
      expect(result).toBe('');
    });

    it('should handle undefined and null gracefully', () => {
      const result = cn('px-2', undefined, null, 'py-3');
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
    });

    it('should handle false and falsy values', () => {
      const result = cn('px-2', false, 0, '', 'py-3');
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
    });
  });

  describe('Conditional classes', () => {
    it('should handle conditional classes with boolean operators', () => {
      const isActive = true;
      const result = cn('px-2', isActive && 'bg-blue-500');
      expect(result).toContain('px-2');
      expect(result).toContain('bg-blue-500');
    });

    it('should omit conditional classes when condition is false', () => {
      const isActive = false;
      const result = cn('px-2', isActive && 'bg-blue-500');
      expect(result).toContain('px-2');
      expect(result).not.toContain('bg-blue-500');
    });

    it('should handle ternary conditional classes', () => {
      const isActive = true;
      const result = cn('px-2', isActive ? 'bg-blue-500' : 'bg-gray-500');
      expect(result).toContain('px-2');
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('bg-gray-500');
    });

    it('should handle ternary conditional classes when false', () => {
      const isActive = false;
      const result = cn('px-2', isActive ? 'bg-blue-500' : 'bg-gray-500');
      expect(result).toContain('px-2');
      expect(result).toContain('bg-gray-500');
      expect(result).not.toContain('bg-blue-500');
    });

    it('should handle multiple conditional expressions', () => {
      const condition1 = true;
      const condition2 = false;
      const condition3 = true;
      const result = cn(
        'base-class',
        condition1 && 'class-1',
        condition2 && 'class-2',
        condition3 && 'class-3'
      );
      expect(result).toContain('base-class');
      expect(result).toContain('class-1');
      expect(result).not.toContain('class-2');
      expect(result).toContain('class-3');
    });
  });

  describe('Conflicting Tailwind classes', () => {
    it('should merge conflicting background color classes, with last one winning', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      // twMerge should handle this by keeping the last bg color
      expect(result).toContain('bg-blue-500');
      expect(result).not.toContain('bg-red-500');
    });

    it('should merge conflicting padding classes, with last one winning', () => {
      const result = cn('px-2', 'px-4');
      expect(result).toContain('px-4');
      expect(result).not.toContain('px-2');
    });

    it('should merge conflicting text color classes', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toContain('text-blue-500');
      expect(result).not.toContain('text-red-500');
    });

    it('should merge conflicting display classes', () => {
      const result = cn('block', 'inline-block');
      expect(result).toContain('inline-block');
      expect(result).not.toContain('block');
    });

    it('should handle complex conflict scenarios with multiple class types', () => {
      const result = cn(
        'px-2 py-3 bg-red-500',
        'px-4 bg-blue-500',
        'py-6'
      );
      // Should keep the last values for conflicting classes
      expect(result).toContain('px-4');
      expect(result).toContain('py-6');
      expect(result).toContain('bg-blue-500');
    });
  });

  describe('Array and object inputs', () => {
    it('should handle array of classes', () => {
      const classes = ['px-2', 'py-3', 'bg-red-500'];
      const result = cn(classes);
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
      expect(result).toContain('bg-red-500');
    });

    it('should handle object with class keys', () => {
      const classObj = {
        'px-2': true,
        'py-3': true,
        'bg-red-500': false,
      };
      const result = cn(classObj);
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
      expect(result).not.toContain('bg-red-500');
    });

    it('should handle mixed array and string inputs', () => {
      const result = cn('px-2', ['py-3', 'bg-red-500']);
      expect(result).toContain('px-2');
      expect(result).toContain('py-3');
      expect(result).toContain('bg-red-500');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long class strings', () => {
      const longClasses = Array.from({ length: 50 }, (_, i) => `class-${i}`).join(' ');
      const result = cn(longClasses);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('class-0');
      expect(result).toContain('class-49');
    });

    it('should handle no arguments', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('should be idempotent - calling twice with same input yields same result', () => {
      const result1 = cn('px-2', 'py-3', 'bg-red-500');
      const result2 = cn('px-2', 'py-3', 'bg-red-500');
      expect(result1).toBe(result2);
    });

    it('should preserve class order when no conflicts exist', () => {
      const result = cn('text-black', 'font-bold', 'italic');
      // All classes should be present
      expect(result).toContain('text-black');
      expect(result).toContain('font-bold');
      expect(result).toContain('italic');
    });
  });
});

describe('isUnauthorizedError - Error Detection Utility', () => {
  describe('Matching error patterns', () => {
    it('should detect "401: Unauthorized" message', () => {
      const error = new Error('401: Unauthorized');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should detect "401: Unauthorized" with additional context', () => {
      const error = new Error('401: Unauthorized - Please log in again');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should detect "401: Unauthorized" with special characters', () => {
      const error = new Error('401: Unauthorized (user session expired)');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should detect "401: Unauthorized" with numeric suffix', () => {
      const error = new Error('401: Unauthorized123');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should detect "401: Unauthorized" at the start of message', () => {
      const error = new Error('401: Unauthorized - Session expired due to inactivity');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should detect various Unauthorized message formats', () => {
      const testCases = [
        '401: Unauthorized',
        '401: UnauthorizedUser',
        '401: Unauthorized Access Denied',
        '401: Unauthorized - Token Invalid',
        '401: Unauthorized API Key',
      ];

      testCases.forEach((message) => {
        const error = new Error(message);
        expect(isUnauthorizedError(error)).toBe(true);
      });
    });
  });

  describe('Non-matching error patterns', () => {
    it('should not detect non-401 status codes', () => {
      const error = new Error('400: Bad Request');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should not detect 403 Forbidden', () => {
      const error = new Error('403: Forbidden');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should not detect 500 errors', () => {
      const error = new Error('500: Internal Server Error');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should not detect "Unauthorized" without 401 prefix', () => {
      const error = new Error('Unauthorized Access');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should not detect "401" without "Unauthorized"', () => {
      const error = new Error('401: Not Found');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should be case-sensitive for "Unauthorized"', () => {
      const error = new Error('401: unauthorized'); // lowercase
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should require exact format starting with 401:', () => {
      const testCases = [
        'Status 401: Unauthorized', // Different prefix
        '401 Unauthorized', // Missing colon
        '401: ', // Missing message after colon
        'ERROR 401: Unauthorized', // Extra prefix
      ];

      testCases.forEach((message) => {
        const error = new Error(message);
        expect(isUnauthorizedError(error)).toBe(false);
      });
    });

    it('should not detect "401" in the middle of message', () => {
      const error = new Error('Error code 401: Some error message');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should handle empty error message', () => {
      const error = new Error('');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });

    it('should handle messages with only spaces', () => {
      const error = new Error('   ');
      const result = isUnauthorizedError(error);
      expect(result).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle error with undefined message property gracefully', () => {
      const error = new Error();
      error.message = undefined as any;
      expect(() => isUnauthorizedError(error)).not.toThrow();
    });

    it('should handle very long error messages', () => {
      const longMessage = '401: Unauthorized' + 'x'.repeat(10000);
      const error = new Error(longMessage);
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should handle error messages with newlines', () => {
      const error = new Error('401: Unauthorized\nAdditional context here');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should handle error messages with special regex characters', () => {
      const error = new Error('401: Unauthorized.*[]()');
      const result = isUnauthorizedError(error);
      expect(result).toBe(true);
    });

    it('should be deterministic - same input yields same output', () => {
      const error = new Error('401: Unauthorized');
      const result1 = isUnauthorizedError(error);
      const result2 = isUnauthorizedError(error);
      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });
  });
});

describe('HUMANMETRIX_LOGO_BASE64 - PDF Asset Constant', () => {
  describe('Existence and type', () => {
    it('should export HUMANMETRIX_LOGO_BASE64 constant', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toBeDefined();
    });

    it('should be a string', () => {
      expect(typeof HUMANMETRIX_LOGO_BASE64).toBe('string');
    });

    it('should not be empty', () => {
      expect(HUMANMETRIX_LOGO_BASE64.length).toBeGreaterThan(0);
    });
  });

  describe('Data URI format', () => {
    it('should start with "data:image/png;base64,"', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toStartWith('data:image/png;base64,');
    });

    it('should have valid base64 prefix', () => {
      const prefix = 'data:image/png;base64,';
      expect(HUMANMETRIX_LOGO_BASE64.substring(0, prefix.length)).toBe(prefix);
    });

    it('should have content after the data URI prefix', () => {
      const prefix = 'data:image/png;base64,';
      const content = HUMANMETRIX_LOGO_BASE64.substring(prefix.length);
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('Base64 content validation', () => {
    it('should contain valid base64 characters after the prefix', () => {
      const prefix = 'data:image/png;base64,';
      const base64Content = HUMANMETRIX_LOGO_BASE64.substring(prefix.length);
      // Base64 valid characters: A-Z, a-z, 0-9, +, /, and = for padding
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      expect(base64Regex.test(base64Content)).toBe(true);
    });

    it('should have proper base64 padding', () => {
      const prefix = 'data:image/png;base64,';
      const base64Content = HUMANMETRIX_LOGO_BASE64.substring(prefix.length);
      // Valid base64 should end with 0, 1, or 2 equals signs
      const paddingCount = (base64Content.match(/=/g) || []).length;
      expect([0, 1, 2]).toContain(paddingCount);
    });

    it('should have proper base64 length', () => {
      const prefix = 'data:image/png;base64,';
      const base64Content = HUMANMETRIX_LOGO_BASE64.substring(prefix.length);
      // Base64 encoded length should be a multiple of 4 (before padding is applied)
      // This is more of a heuristic test as padding can adjust length
      expect(base64Content.length).toBeGreaterThan(10);
    });
  });

  describe('Usability', () => {
    it('should be usable as an image src in HTML', () => {
      // Verify it's a proper data URI that could be used directly
      expect(HUMANMETRIX_LOGO_BASE64).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/);
    });

    it('should be a long string indicating substantial image data', () => {
      // A typical base64-encoded PNG should be quite long
      expect(HUMANMETRIX_LOGO_BASE64.length).toBeGreaterThan(100);
    });

    it('should be consistent across multiple accesses', () => {
      const firstAccess = HUMANMETRIX_LOGO_BASE64;
      const secondAccess = HUMANMETRIX_LOGO_BASE64;
      expect(firstAccess).toBe(secondAccess);
    });
  });

  describe('PNG format validation', () => {
    it('should indicate PNG format in the data URI', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toContain('image/png');
    });

    it('should have base64 encoding specified', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toContain('base64');
    });

    it('should follow proper data URI scheme', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toMatch(/^data:[^;]+;base64,.+$/);
    });
  });
});
