import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('signatureFont', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('when font file exists', () => {
    it('should load the base64 font content successfully', async () => {
      const mockBase64Content = 'AAABAAECAAA='; // Mock base64 content

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => mockBase64Content),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont()).toBe(mockBase64Content);
    });

    it('should return the correct FONT_NAME constant', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'AAABAAECAAA='),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME).toBe('DancingScript');
    });

    it('should handle long base64 font content', async () => {
      const longBase64 = 'A'.repeat(1000); // Long base64 string

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => longBase64),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont()).toBe(longBase64);
      expect(mod.getDancingScriptFont().length).toBe(1000);
    });
  });

  describe('when font file does not exist', () => {
    it('should return empty string when file not found', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('ENOENT: no such file or directory');
        }),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont()).toBe('');
    });

    it('should return empty string when readFileSync throws any error', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('Permission denied');
        }),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont()).toBe('');
    });

    it('should still export FONT_NAME even when file not found', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('File not found');
        }),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME).toBe('DancingScript');
    });
  });

  describe('getDancingScriptFont function', () => {
    it('should return truthy value when font is loaded', async () => {
      const mockBase64 = 'mockBase64Content';

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => mockBase64),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      const result = mod.getDancingScriptFont();
      expect(!!result).toBe(true);
    });

    it('should return falsy value when font is not loaded', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('File not found');
        }),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      const result = mod.getDancingScriptFont();
      expect(!!result).toBe(false);
    });

    it('should consistently return the same value on multiple calls', async () => {
      const mockBase64 = 'consistentBase64Value';

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => mockBase64),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      const result1 = mod.getDancingScriptFont();
      const result2 = mod.getDancingScriptFont();
      const result3 = mod.getDancingScriptFont();

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(mockBase64);
    });
  });

  describe('FONT_NAME export', () => {
    it('should be a string constant', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(typeof mod.FONT_NAME).toBe('string');
    });

    it('should equal DancingScript', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME).toBe('DancingScript');
    });

    it('should not be empty', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME.length).toBeGreaterThan(0);
    });

    it('should match the exact font name', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME).toMatch(/^DancingScript$/);
    });
  });

  describe('module exports', () => {
    it('should export getDancingScriptFont as a function', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(typeof mod.getDancingScriptFont).toBe('function');
    });

    it('should export FONT_NAME as a constant', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.FONT_NAME).toBeDefined();
      expect(typeof mod.FONT_NAME).toBe('string');
    });

    it('should have both exports available', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => 'mockContent'),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont).toBeDefined();
      expect(mod.FONT_NAME).toBeDefined();
    });
  });

  describe('error handling at module load time', () => {
    it('should gracefully handle file read errors during module initialization', async () => {
      const readFileError = new Error('EACCES: permission denied');

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw readFileError;
        }),
      }), { virtual: true });

      // Module should load without throwing
      const mod = await import('../../server/signatureFont');
      expect(mod).toBeDefined();
      expect(() => mod.getDancingScriptFont()).not.toThrow();
    });

    it('should not propagate file read errors to callers', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => {
          throw new Error('File system error');
        }),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(() => {
        mod.getDancingScriptFont();
      }).not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should work with empty file content', async () => {
      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => ''),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      // Empty string is falsy, so getDancingScriptFont should return ''
      expect(mod.getDancingScriptFont()).toBe('');
    });

    it('should work with whitespace-only content', async () => {
      const whitespaceContent = '   \n\t  ';

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => whitespaceContent),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      // Whitespace is truthy, so it should return the content
      expect(mod.getDancingScriptFont()).toBe(whitespaceContent);
    });

    it('should handle special characters in font content', async () => {
      const specialContent = 'AAA/+==\n\r\t';

      vi.doMock('fs', () => ({
        readFileSync: vi.fn(() => specialContent),
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mod.getDancingScriptFont()).toBe(specialContent);
    });
  });

  describe('coverage for try-catch block', () => {
    it('should execute the try block when file exists', async () => {
      const mockBase64 = 'base64data';
      const mockReadFileSync = vi.fn(() => mockBase64);

      vi.doMock('fs', () => ({
        readFileSync: mockReadFileSync,
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mockReadFileSync).toHaveBeenCalledWith('/tmp/DancingScript-Bold-base64.txt', 'utf-8');
      expect(mod.getDancingScriptFont()).toBe(mockBase64);
    });

    it('should execute the catch block when file does not exist', async () => {
      const mockReadFileSync = vi.fn(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      vi.doMock('fs', () => ({
        readFileSync: mockReadFileSync,
      }), { virtual: true });

      const mod = await import('../../server/signatureFont');
      expect(mockReadFileSync).toHaveBeenCalled();
      expect(mod.getDancingScriptFont()).toBe('');
    });
  });
});
