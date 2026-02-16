import { describe, it, expect } from 'vitest';
import { HUMANMETRIX_LOGO_BASE64 } from '../../client/src/lib/pdfAssets';

describe('client/src/lib/pdfAssets', () => {
  describe('HUMANMETRIX_LOGO_BASE64', () => {
    it('should be exported as a string', () => {
      expect(typeof HUMANMETRIX_LOGO_BASE64).toBe('string');
    });

    it('should be a valid base64 data URI for a PNG image', () => {
      expect(HUMANMETRIX_LOGO_BASE64).toMatch(/^data:image\/png;base64,/);
    });

    it('should contain base64 encoded data after the prefix', () => {
      const base64Data = HUMANMETRIX_LOGO_BASE64.replace('data:image/png;base64,', '');
      expect(base64Data.length).toBeGreaterThan(0);
    });

    it('should not be empty', () => {
      expect(HUMANMETRIX_LOGO_BASE64.length).toBeGreaterThan(0);
    });
  });
});
