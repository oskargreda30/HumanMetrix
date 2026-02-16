import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

const mockPage: any = {
  on: vi.fn(),
  setViewport: vi.fn().mockResolvedValue(undefined),
  goto: vi.fn().mockResolvedValue(undefined),
  title: vi.fn().mockResolvedValue('Test Page'),
  waitForSelector: vi.fn().mockResolvedValue(undefined),
  evaluate: vi.fn().mockResolvedValue(undefined),
  screenshot: vi.fn().mockResolvedValue(Buffer.alloc(100)),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockBrowser: any = {
  connected: true,
  newPage: vi.fn().mockResolvedValue(mockPage),
  close: vi.fn().mockResolvedValue(undefined),
};

const mockStatSync = vi.fn();
const mockExecSync = vi.fn();

vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue(mockBrowser),
  },
}));

vi.mock('child_process', () => ({
  execSync: mockExecSync,
}));

vi.mock('fs', () => ({
  statSync: mockStatSync,
}));

const mockPdfInstance: any = {
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
  },
  addImage: vi.fn(),
  addPage: vi.fn(),
  output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
  getNumberOfPages: vi.fn().mockReturnValue(1),
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdfInstance),
}));

function createPngBuffer(width: number, height: number): Buffer {
  const buf = Buffer.alloc(30);
  buf.write('\x89PNG\r\n\x1a\n', 0, 'binary');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function resetMocks() {
  mockBrowser.connected = true;
  mockBrowser.newPage.mockResolvedValue(mockPage);
  mockBrowser.close.mockResolvedValue(undefined);
  mockPage.on.mockReset();
  mockPage.setViewport.mockResolvedValue(undefined);
  mockPage.goto.mockResolvedValue(undefined);
  mockPage.title.mockResolvedValue('Test Page');
  mockPage.waitForSelector.mockResolvedValue(undefined);
  mockPage.evaluate.mockResolvedValue(undefined);
  mockPage.close.mockResolvedValue(undefined);
  mockPage.screenshot.mockResolvedValue(createPngBuffer(1200, 800));
  mockPdfInstance.addImage.mockReset();
  mockPdfInstance.addPage.mockReset();
  mockPdfInstance.output.mockReturnValue(new ArrayBuffer(100));
  mockPdfInstance.getNumberOfPages.mockReturnValue(1);
  mockPdfInstance.internal.pageSize.getWidth.mockReturnValue(210);
  mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(297);
  mockStatSync.mockReset();
  mockExecSync.mockReset();
}

describe('pdfGenerator', () => {
  const savedPort = process.env.PORT;
  const savedPuppeteerPath = process.env.PUPPETEER_EXECUTABLE_PATH;

  beforeAll(() => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });
  });

  afterEach(() => {
    if (savedPort !== undefined) process.env.PORT = savedPort;
    else delete process.env.PORT;
    if (savedPuppeteerPath !== undefined) process.env.PUPPETEER_EXECUTABLE_PATH = savedPuppeteerPath;
    else delete process.env.PUPPETEER_EXECUTABLE_PATH;
  });

  describe('generatePDFFromUrl - basic', () => {
    beforeEach(() => {
      resetMocks();
    });

    it('should generate PDF successfully', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      const result = await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPage.goto).toHaveBeenCalledWith('http://localhost:5000/test', { waitUntil: 'networkidle0', timeout: 60000 });
      expect(mockPage.screenshot).toHaveBeenCalled();
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should set viewport correctly', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect(mockPage.setViewport).toHaveBeenCalledWith({ width: 1200, height: 800, deviceScaleFactor: 2 });
    });

    it('should use waitForSelector when provided', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test', waitForSelector: '.my-content' });
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.my-content', { timeout: 30000 });
    });

    it('should skip primary waitForSelector when not provided', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const primaryCalls = mockPage.waitForSelector.mock.calls.filter((c: any[]) => c[1]?.timeout === 30000);
      expect(primaryCalls).toHaveLength(0);
    });

    it('should handle primary waitForSelector timeout', async () => {
      mockPage.waitForSelector
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      const result = await generatePDFFromUrl({ url: 'http://localhost:5000/test', waitForSelector: '.miss' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle charts selector timeout', async () => {
      mockPage.waitForSelector
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValueOnce(undefined);
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      const result = await generatePDFFromUrl({ url: 'http://localhost:5000/test', waitForSelector: '.c' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle chart element selector timeout', async () => {
      mockPage.waitForSelector
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Timeout'));
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      const result = await generatePDFFromUrl({ url: 'http://localhost:5000/test', waitForSelector: '.c' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should register event listeners', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const events = mockPage.on.mock.calls.map((c: any[]) => c[0]);
      expect(events).toContain('console');
      expect(events).toContain('pageerror');
      expect(events).toContain('requestfailed');
    });

    it('should handle console error messages', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const handler = mockPage.on.mock.calls.find((c: any[]) => c[0] === 'console')[1];
      handler({ type: () => 'error', text: () => 'err' });
      handler({ type: () => 'log', text: () => 'info' });
    });

    it('should handle pageerror events', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const handler = mockPage.on.mock.calls.find((c: any[]) => c[0] === 'pageerror')[1];
      handler(new Error('JS err'));
    });

    it('should handle requestfailed events', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const handler = mockPage.on.mock.calls.find((c: any[]) => c[0] === 'requestfailed')[1];
      handler({ url: () => 'http://x.com/fail', failure: () => ({ errorText: 'net::ERR' }) });
    });

    it('should throw and close page on navigation error', async () => {
      mockPage.goto.mockRejectedValueOnce(new Error('Nav failed'));
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await expect(generatePDFFromUrl({ url: 'http://localhost:5000/test' })).rejects.toThrow('Nav failed');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should throw and close page on screenshot error', async () => {
      mockPage.screenshot.mockRejectedValueOnce(new Error('Shot failed'));
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await expect(generatePDFFromUrl({ url: 'http://localhost:5000/test' })).rejects.toThrow('Shot failed');
      expect(mockPage.close).toHaveBeenCalled();
    });

    it('should call page.evaluate', async () => {
      const { generatePDFFromUrl } = await import('../../server/pdfGenerator');
      await generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect(mockPage.evaluate).toHaveBeenCalled();
    });
  });

  describe('getBrowser and closeBrowser', () => {
    beforeEach(() => {
      resetMocks();
      vi.resetModules();
    });

    it('should launch browser on first call', async () => {
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });

    it('should reuse browser when connected', async () => {
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t1' });
      resetMocks();
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t2' });
      expect(puppeteer.launch).toHaveBeenCalledTimes(1);
    });

    it('should relaunch when disconnected', async () => {
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t1' });
      mockBrowser.connected = false;
      resetMocks();
      mockBrowser.connected = false;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t2' });
      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });

    it('should close existing browser', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t1' });
      await mod.closeBrowser();
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('should no-op closeBrowser without browser', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.closeBrowser();
      expect(mockBrowser.close).not.toHaveBeenCalled();
    });

    it('should null browser after close', async () => {
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t1' });
      await mod.closeBrowser();
      resetMocks();
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/t2' });
      expect(puppeteer.launch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getInternalPort via generateResultsPDF', () => {
    beforeEach(() => {
      resetMocks();
      vi.resetModules();
    });

    it('should use valid PORT', async () => {
      process.env.PORT = '3000';
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(mockPage.goto.mock.calls[0][0]).toContain('127.0.0.1:3000');
    });

    it('should default to 5000 when PORT missing', async () => {
      delete process.env.PORT;
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(mockPage.goto.mock.calls[0][0]).toContain('127.0.0.1:5000');
    });

    it('should default to 5000 when PORT is NaN', async () => {
      process.env.PORT = 'abc';
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(mockPage.goto.mock.calls[0][0]).toContain('127.0.0.1:5000');
    });
  });

  describe('getPdfBaseUrl', () => {
    beforeEach(() => {
      resetMocks();
      vi.resetModules();
    });

    it('should return localhost URL ignoring requestBaseUrl', async () => {
      process.env.PORT = '4000';
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(mockPage.goto.mock.calls[0][0]).toMatch(/^http:\/\/127\.0\.0\.1:4000/);
    });
  });

  describe('findChromiumPath', () => {
    beforeEach(() => {
      resetMocks();
    });

    it('should use PUPPETEER_EXECUTABLE_PATH', async () => {
      process.env.PUPPETEER_EXECUTABLE_PATH = '/custom/chromium';
      vi.resetModules();
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect(puppeteer.launch).toHaveBeenCalledWith(expect.objectContaining({ executablePath: '/custom/chromium' }));
    });

    it('should use candidate when statSync succeeds', async () => {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      mockStatSync.mockReturnValue({});
      vi.resetModules();
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      expect((puppeteer.launch as any).mock.calls[0][0].executablePath).toContain('chromium');
      expect((puppeteer.launch as any).mock.calls[0][0].executablePath).not.toBe('chromium');
    });

    it('should use which/find fallback when candidate fails', async () => {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      mockStatSync.mockImplementation(() => { throw new Error('ENOENT'); });
      mockExecSync.mockReturnValue('/found/chromium\n');
      vi.resetModules();
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const path = (puppeteer.launch as any).mock.calls[0][0].executablePath;
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should return a string path when all candidates fail', async () => {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      mockStatSync.mockImplementation(() => { throw new Error('ENOENT'); });
      mockExecSync.mockImplementation(() => { throw new Error('nope'); });
      vi.resetModules();
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const path = (puppeteer.launch as any).mock.calls[0][0].executablePath;
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });

    it('should return a string path when execSync returns empty', async () => {
      delete process.env.PUPPETEER_EXECUTABLE_PATH;
      mockStatSync.mockImplementation(() => { throw new Error('ENOENT'); });
      mockExecSync.mockReturnValue('  \n');
      vi.resetModules();
      const mod = await import('../../server/pdfGenerator');
      const puppeteer = (await import('puppeteer')).default;
      await mod.generatePDFFromUrl({ url: 'http://localhost:5000/test' });
      const path = (puppeteer.launch as any).mock.calls[0][0].executablePath;
      expect(typeof path).toBe('string');
      expect(path.length).toBeGreaterThan(0);
    });
  });

  describe('generateResultsPDF', () => {
    beforeEach(() => {
      resetMocks();
      vi.resetModules();
      process.env.PORT = '5000';
    });

    it('should generate PDF with local URL', async () => {
      const mod = await import('../../server/pdfGenerator');
      const result = await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should retry with external URL when local fails', async () => {
      const mod = await import('../../server/pdfGenerator');
      let n = 0;
      mockPage.goto.mockImplementation(async () => { if (++n === 1) throw new Error('fail'); });
      const result = await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(result).toBeInstanceOf(Buffer);
      expect(n).toBe(2);
    });

    it('should throw when local fails and URLs same', async () => {
      const mod = await import('../../server/pdfGenerator');
      mockPage.goto.mockRejectedValue(new Error('fail'));
      await expect(mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' })).rejects.toThrow('fail');
    });

    it('should use default waitForSelector', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('[data-testid="results-content"]', { timeout: 30000 });
    });

    it('should use custom waitForSelector', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000', waitForSelector: '.x' });
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.x', { timeout: 30000 });
    });

    it('should encode email', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generateResultsPDF({ sessionId: 's1', email: 'u+t@x.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(mockPage.goto.mock.calls[0][0]).toContain('u%2Bt%40x.com');
    });
  });

  describe('generateMultiSessionPDF', () => {
    beforeEach(() => {
      resetMocks();
      vi.resetModules();
      process.env.PORT = '5000';
    });

    it('should generate PDF', async () => {
      const mod = await import('../../server/pdfGenerator');
      const result = await mod.generateMultiSessionPDF({ sessionIds: ['s1', 's2'], email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should retry with external URL on local failure', async () => {
      const mod = await import('../../server/pdfGenerator');
      let n = 0;
      mockPage.goto.mockImplementation(async () => { if (++n === 1) throw new Error('fail'); });
      const result = await mod.generateMultiSessionPDF({ sessionIds: ['s1'], email: 'a@b.com', baseUrl: 'https://ext.com' });
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should throw when local fails and URLs same', async () => {
      const mod = await import('../../server/pdfGenerator');
      mockPage.goto.mockRejectedValue(new Error('fail'));
      await expect(mod.generateMultiSessionPDF({ sessionIds: ['s1'], email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' })).rejects.toThrow('fail');
    });

    it('should join session IDs', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generateMultiSessionPDF({ sessionIds: ['a', 'b', 'c'], email: 'x@y.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(mockPage.goto.mock.calls[0][0]).toContain('sessions=a,b,c');
    });

    it('should use bundle-results-content selector', async () => {
      const mod = await import('../../server/pdfGenerator');
      await mod.generateMultiSessionPDF({ sessionIds: ['s1'], email: 'a@b.com', baseUrl: 'http://127.0.0.1:5000' });
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('[data-testid="bundle-results-content"]', { timeout: 30000 });
    });
  });

  describe('signal handlers', () => {
    it('should have SIGINT listener', () => {
      expect(process.listeners('SIGINT').length).toBeGreaterThanOrEqual(1);
    });

    it('should have SIGTERM listener', () => {
      expect(process.listeners('SIGTERM').length).toBeGreaterThanOrEqual(1);
    });
  });
});
