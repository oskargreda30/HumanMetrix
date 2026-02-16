// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCanvas = {
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockcanvasdata'),
  width: 1200,
  height: 3000,
  getContext: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    scale: vi.fn(),
  }),
};

const mockPdfInstance = {
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  output: vi.fn().mockImplementation((type: string) => {
    if (type === 'blob') return new Blob(['pdf-content'], { type: 'application/pdf' });
    if (type === 'datauristring') return 'data:application/pdf;base64,bW9ja3BkZmRhdGE=';
    return new Blob(['pdf-content']);
  }),
  save: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(20),
  splitTextToSize: vi.fn((text: string) => [text]),
  getNumberOfPages: vi.fn().mockReturnValue(2),
  setPage: vi.fn(),
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
    scaleFactor: 1,
  },
};

vi.mock('jspdf', () => ({
  default: vi.fn().mockImplementation(() => mockPdfInstance),
}));

vi.mock('html2canvas', () => ({
  default: vi.fn().mockResolvedValue({
    toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockcanvasdata'),
    width: 1200,
    height: 3000,
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn(), scale: vi.fn() }),
  }),
}));

vi.mock('@/lib/pdfStyles', () => ({
  savePdfMobile: vi.fn(),
}));

import {
  exportResultsPDF,
  exportScreenCapturePDF,
  exportElementAsPDF,
  getBase64FromPDF,
  enableReportMode,
  disableReportMode,
} from '@/lib/pdfScreenCapture';

function resetMocks() {
  Object.values(mockPdfInstance).forEach((val) => {
    if (typeof val === 'function' && 'mockClear' in val) {
      (val as any).mockClear();
    }
  });
  mockPdfInstance.internal.pageSize.getWidth.mockReturnValue(210);
  mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(297);
  mockPdfInstance.output.mockImplementation((type: string) => {
    if (type === 'blob') return new Blob(['pdf-content'], { type: 'application/pdf' });
    if (type === 'datauristring') return 'data:application/pdf;base64,bW9ja3BkZmRhdGE=';
    return new Blob(['pdf-content']);
  });
  mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,mockcanvasdata');
  mockCanvas.width = 1200;
  mockCanvas.height = 3000;
}

function createTestElement(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  el.innerHTML = '<p>Test content</p>';
  Object.defineProperty(el, 'offsetWidth', { value: 800, configurable: true });
  Object.defineProperty(el, 'offsetHeight', { value: 600, configurable: true });
  document.body.appendChild(el);
  return el;
}

function setupFontsMock() {
  if (!document.fonts) {
    Object.defineProperty(document, 'fonts', {
      value: { ready: Promise.resolve() },
      writable: true,
      configurable: true,
    });
  }
}

describe('pdfScreenCapture', () => {
  beforeEach(() => {
    resetMocks();
    setupFontsMock();
    document.body.innerHTML = '';
  });

  describe('exportResultsPDF', () => {
    it('should throw when element not found', async () => {
      await expect(exportResultsPDF({ elementId: 'non-existent' }))
        .rejects.toThrow('Results element not found');
    });

    it('should export PDF successfully with valid element', async () => {
      createTestElement('test-results');
      const result = await exportResultsPDF({ elementId: 'test-results' });
      expect(result.saved).toBe(true);
    });

    it('should use default filename', async () => {
      createTestElement('test-results-2');
      await exportResultsPDF({ elementId: 'test-results-2' });
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should use custom filename', async () => {
      createTestElement('test-results-3');
      await exportResultsPDF({ elementId: 'test-results-3', filename: 'custom-report.pdf' });
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should call onProgress callbacks', async () => {
      createTestElement('test-results-4');
      const onProgress = vi.fn();
      await exportResultsPDF({ elementId: 'test-results-4', onProgress });
      expect(onProgress).toHaveBeenCalled();
    });

    it('should return blob when returnBlob is true', async () => {
      createTestElement('test-results-5');
      const result = await exportResultsPDF({ elementId: 'test-results-5', returnBlob: true });
      expect(result.saved).toBe(false);
      expect(result.blob).toBeDefined();
    });

    it('should handle canvas with multiple pages of content', async () => {
      createTestElement('test-results-6');
      await exportResultsPDF({ elementId: 'test-results-6' });
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should retry with lower scale on desktop failure', async () => {
      createTestElement('test-results-7');
      const html2canvasMod = await import('html2canvas');
      (html2canvasMod.default as any)
        .mockRejectedValueOnce(new Error('Canvas too large'))
        .mockResolvedValueOnce(mockCanvas);

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        writable: true,
        configurable: true,
      });

      const result = await exportResultsPDF({ elementId: 'test-results-7' });
      expect(result.saved).toBe(true);
    });

    it('should throw on mobile when capture fails', async () => {
      createTestElement('test-results-8');
      const html2canvasMod = await import('html2canvas');
      (html2canvasMod.default as any).mockRejectedValueOnce(new Error('Canvas error'));

      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        writable: true,
        configurable: true,
      });

      await expect(exportResultsPDF({ elementId: 'test-results-8' }))
        .rejects.toThrow('Canvas error');
    });
  });

  describe('exportScreenCapturePDF', () => {
    it('should delegate to exportResultsPDF', async () => {
      createTestElement('screen-capture-test');
      await exportScreenCapturePDF({ reportElementId: 'screen-capture-test' });
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should use custom filename', async () => {
      createTestElement('screen-capture-test-2');
      await exportScreenCapturePDF({
        reportElementId: 'screen-capture-test-2',
        filename: 'my-comparison.pdf',
      });
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should call onProgress', async () => {
      createTestElement('screen-capture-test-3');
      const onProgress = vi.fn();
      await exportScreenCapturePDF({
        reportElementId: 'screen-capture-test-3',
        onProgress,
      });
      expect(onProgress).toHaveBeenCalled();
    });
  });

  describe('exportElementAsPDF', () => {
    it('should export element to PDF', async () => {
      const el = createTestElement('element-pdf');
      await exportElementAsPDF(el);
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should use custom filename', async () => {
      const el = createTestElement('element-pdf-2');
      await exportElementAsPDF(el, 'custom-element.pdf');
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      expect(savePdfMobile).toHaveBeenCalled();
    });

    it('should call onProgress callbacks', async () => {
      const el = createTestElement('element-pdf-3');
      const onProgress = vi.fn();
      await exportElementAsPDF(el, 'report.pdf', onProgress);
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle tall content requiring multiple pages', async () => {
      const el = createTestElement('element-pdf-4');
      await exportElementAsPDF(el);
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });
  });

  describe('getBase64FromPDF', () => {
    it('should throw when element not found', async () => {
      await expect(getBase64FromPDF({ elementId: 'missing' }))
        .rejects.toThrow('Results element not found');
    });

    it('should return base64 string', async () => {
      createTestElement('base64-test');
      const result = await getBase64FromPDF({ elementId: 'base64-test' });
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should call onProgress callbacks', async () => {
      createTestElement('base64-test-2');
      const onProgress = vi.fn();
      await getBase64FromPDF({ elementId: 'base64-test-2', onProgress });
      expect(onProgress).toHaveBeenCalled();
    });

    it('should handle tall content with multiple pages', async () => {
      createTestElement('base64-test-3');
      const result = await getBase64FromPDF({ elementId: 'base64-test-3' });
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });
  });

  describe('enableReportMode', () => {
    it('should add report-mode class', () => {
      const el = document.createElement('div');
      enableReportMode(el);
      expect(el.classList.contains('report-mode')).toBe(true);
    });

    it('should not duplicate report-mode class', () => {
      const el = document.createElement('div');
      enableReportMode(el);
      enableReportMode(el);
      expect(el.classList.length).toBe(1);
    });
  });

  describe('disableReportMode', () => {
    it('should remove report-mode class', () => {
      const el = document.createElement('div');
      el.classList.add('report-mode');
      disableReportMode(el);
      expect(el.classList.contains('report-mode')).toBe(false);
    });

    it('should handle element without report-mode class', () => {
      const el = document.createElement('div');
      disableReportMode(el);
      expect(el.classList.contains('report-mode')).toBe(false);
    });
  });
});
