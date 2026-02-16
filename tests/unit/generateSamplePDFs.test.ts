import { describe, it, expect, vi, beforeEach } from 'vitest';

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
  output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(50),
  splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
  getNumberOfPages: vi.fn().mockReturnValue(3),
  setPage: vi.fn(),
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
  },
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdfInstance),
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/mock/server/generateSamplePDFs.ts'),
}));

vi.mock('path', () => ({
  join: vi.fn().mockImplementation((...args: string[]) => args.join('/')),
  dirname: vi.fn().mockReturnValue('/mock/server'),
}));

const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn().mockReturnValue(true);

vi.mock('fs', () => ({
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
  existsSync: mockExistsSync,
}));

describe('generateSamplePDFs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    mockPdfInstance.setFontSize.mockClear();
    mockPdfInstance.setFont.mockClear();
    mockPdfInstance.setTextColor.mockClear();
    mockPdfInstance.setFillColor.mockClear();
    mockPdfInstance.setDrawColor.mockClear();
    mockPdfInstance.setLineWidth.mockClear();
    mockPdfInstance.rect.mockClear();
    mockPdfInstance.text.mockClear();
    mockPdfInstance.line.mockClear();
    mockPdfInstance.addImage.mockClear();
    mockPdfInstance.addPage.mockClear();
    mockPdfInstance.output.mockClear().mockReturnValue(new ArrayBuffer(8));
    mockPdfInstance.roundedRect.mockClear();
    mockPdfInstance.getTextWidth.mockClear().mockReturnValue(50);
    mockPdfInstance.splitTextToSize.mockClear().mockImplementation((text: string) => [text]);
    mockPdfInstance.getNumberOfPages.mockClear().mockReturnValue(3);
    mockPdfInstance.setPage.mockClear();

    mockReadFileSync.mockReset();
    mockWriteFileSync.mockReset();
    mockExistsSync.mockReset().mockReturnValue(true);
  });

  describe('Module-level logo loading - success path', () => {
    it('should load the logo from pdfAssets.ts when regex matches', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,TESTLOGO123';"
      );

      await import('../../server/generateSamplePDFs.ts');

      expect(mockReadFileSync).toHaveBeenCalledWith(
        expect.stringContaining('pdfAssets.ts'),
        'utf-8'
      );
    });

    it('should generate all 3 PDFs and write them to disk', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,ABC';"
      );

      await import('../../server/generateSamplePDFs.ts');

      expect(mockWriteFileSync).toHaveBeenCalledTimes(3);

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('individual-sample.pdf'),
        expect.any(Buffer)
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('comparison-sample.pdf'),
        expect.any(Buffer)
      );
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('rolefit-sample.pdf'),
        expect.any(Buffer)
      );
    });

    it('should create 3 jsPDF instances (individual, comparison, rolefit)', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,XYZ';"
      );

      const { jsPDF } = await import('jspdf');
      await import('../../server/generateSamplePDFs.ts');

      expect(jsPDF).toHaveBeenCalledTimes(3);
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should call addImage when logo is available', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,LOGODATA';"
      );

      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.addImage).toHaveBeenCalledWith(
        'data:image/png;base64,LOGODATA',
        'PNG',
        12, 3, 45, 45
      );
    });

    it('should call output with arraybuffer for each PDF', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,OUT';"
      );

      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.output).toHaveBeenCalledWith('arraybuffer');
      expect(mockPdfInstance.output).toHaveBeenCalledTimes(3);
    });
  });

  describe('Module-level logo loading - failure path', () => {
    it('should set empty logo when regex does not match', async () => {
      mockReadFileSync.mockReturnValue('export const SOMETHING_ELSE = "nope";');

      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.addImage).not.toHaveBeenCalled();
    });
  });

  describe('PDF structure and helper function calls', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,STRUCT';"
      );
    });

    it('should add background pattern (white fill + rect) on pages', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const fillCalls = mockPdfInstance.setFillColor.mock.calls;
      const whiteFills = fillCalls.filter(
        (c: number[]) => c[0] === 255 && c[1] === 255 && c[2] === 255
      );
      expect(whiteFills.length).toBeGreaterThan(0);
    });

    it('should add headers with HUMANMETRIX text', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const humanmetrixCalls = textCalls.filter(
        (c: any[]) => c[0] === 'HUMANMETRIX'
      );
      expect(humanmetrixCalls.length).toBeGreaterThan(0);
    });

    it('should add AI-Powered Assessment Platform tagline', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const taglineCalls = textCalls.filter(
        (c: any[]) => c[0] === 'AI-Powered Assessment Platform'
      );
      expect(taglineCalls.length).toBeGreaterThan(0);
    });

    it('should add footers with page numbers', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.setPage).toHaveBeenCalled();

      const textCalls = mockPdfInstance.text.mock.calls;
      const pageCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].startsWith('Page ')
      );
      expect(pageCalls.length).toBeGreaterThan(0);
    });

    it('should add copyright text in footers', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const copyrightCalls = textCalls.filter(
        (c: any[]) => c[0] === '\u00a9 HumanMetrix' || c[0] === '© HumanMetrix'
      );
      expect(copyrightCalls.length).toBeGreaterThan(0);
    });

    it('should add section headers with gray background', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const fillCalls = mockPdfInstance.setFillColor.mock.calls;
      const grayFills = fillCalls.filter(
        (c: number[]) => c[0] === 243 && c[1] === 244 && c[2] === 246
      );
      expect(grayFills.length).toBeGreaterThan(0);
    });

    it('should add multiple pages for each PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });

    it('should render candidate names in individual PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const sarahCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('Sarah')
      );
      expect(sarahCalls.length).toBeGreaterThan(0);
    });

    it('should render FIT assessment section header', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const fitCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('FIT ASSESSMENT')
      );
      expect(fitCalls.length).toBeGreaterThan(0);
    });

    it('should render AI Readiness section header', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const aiCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('AI READINESS')
      );
      expect(aiCalls.length).toBeGreaterThan(0);
    });

    it('should render Prompt Architecture section', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const promptCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('PROMPT ARCHITECTURE')
      );
      expect(promptCalls.length).toBeGreaterThan(0);
    });

    it('should render AIQ section', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const aiqCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && (c[0].includes('AIQ') || c[0].includes('ALGORITHMIC INTEGRITY'))
      );
      expect(aiqCalls.length).toBeGreaterThan(0);
    });

    it('should render progress bars using rect', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.rect).toHaveBeenCalled();
      const rectCalls = mockPdfInstance.rect.mock.calls;
      const fillRects = rectCalls.filter((c: any[]) => c[4] === 'F');
      expect(fillRects.length).toBeGreaterThan(10);
    });

    it('should use roundedRect for score cards', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.roundedRect).toHaveBeenCalled();
    });

    it('should set line for table separators in comparison PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.line).toHaveBeenCalled();
    });

    it('should render score values as text', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const scoreCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && /^\d+$/.test(c[0])
      );
      expect(scoreCalls.length).toBeGreaterThan(0);
    });

    it('should render candidate comparison title', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const compCalls = textCalls.filter(
        (c: any[]) => c[0] === 'CANDIDATE COMPARISON'
      );
      expect(compCalls.length).toBeGreaterThan(0);
    });

    it('should render role fit analysis title', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const roleCalls = textCalls.filter(
        (c: any[]) => c[0] === 'ROLE FIT ANALYSIS'
      );
      expect(roleCalls.length).toBeGreaterThan(0);
    });

    it('should render OVERALL FIT SCORE section in role fit PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const fitScoreCalls = textCalls.filter(
        (c: any[]) => c[0] === 'OVERALL FIT SCORE'
      );
      expect(fitScoreCalls.length).toBeGreaterThan(0);
    });

    it('should render KEY STRENGTHS section in role fit PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const strengthCalls = textCalls.filter(
        (c: any[]) => c[0] === 'KEY STRENGTHS'
      );
      expect(strengthCalls.length).toBeGreaterThan(0);
    });

    it('should call splitTextToSize for strength items', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.splitTextToSize).toHaveBeenCalled();
    });

    it('should render skill alignment section', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const alignCalls = textCalls.filter(
        (c: any[]) => c[0] === 'SKILL ALIGNMENT ANALYSIS'
      );
      expect(alignCalls.length).toBeGreaterThan(0);
    });

    it('should use setLineWidth for bordered cards', async () => {
      await import('../../server/generateSamplePDFs.ts');

      expect(mockPdfInstance.setLineWidth).toHaveBeenCalled();
    });

    it('should render metrics data (Skills Assessed, Average Score)', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const skillsAssessed = textCalls.filter(
        (c: any[]) => c[0] === 'Skills Assessed'
      );
      const avgScore = textCalls.filter(
        (c: any[]) => c[0] === 'Average Score'
      );
      expect(skillsAssessed.length).toBeGreaterThan(0);
      expect(avgScore.length).toBeGreaterThan(0);
    });

    it('should render CANDIDATE PROFILE in individual PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const profileCalls = textCalls.filter(
        (c: any[]) => c[0] === 'CANDIDATE PROFILE'
      );
      expect(profileCalls.length).toBeGreaterThan(0);
    });

    it('should render all performance levels via color coding', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const colorCalls = mockPdfInstance.setTextColor.mock.calls;
      const greenCalls = colorCalls.filter(
        (c: number[]) => c[0] === 34 && c[1] === 197 && c[2] === 94
      );
      const blueCalls = colorCalls.filter(
        (c: number[]) => c[0] === 59 && c[1] === 130 && c[2] === 246
      );
      expect(greenCalls.length).toBeGreaterThan(0);
      expect(blueCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling in addHeader logo', () => {
    it('should handle addImage throwing an error gracefully', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,BADLOGO';"
      );
      mockPdfInstance.addImage.mockImplementation(() => {
        throw new Error('Image loading failed');
      });

      await expect(import('../../server/generateSamplePDFs.ts')).resolves.not.toThrow();

      expect(mockWriteFileSync).toHaveBeenCalledTimes(3);
    });
  });

  describe('Comparison PDF specific behavior', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,CMP';"
      );
    });

    it('should render candidate labels (CANDIDATE 1, CANDIDATE 2)', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const c1 = textCalls.filter((c: any[]) => c[0] === 'CANDIDATE 1');
      const c2 = textCalls.filter((c: any[]) => c[0] === 'CANDIDATE 2');
      expect(c1.length).toBeGreaterThan(0);
      expect(c2.length).toBeGreaterThan(0);
    });

    it('should render Skill Name column header', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const skillNameCalls = textCalls.filter(
        (c: any[]) => c[0] === 'Skill Name'
      );
      expect(skillNameCalls.length).toBeGreaterThan(0);
    });

    it('should render Marcus in comparison PDF', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const marcusCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('Marcus')
      );
      expect(marcusCalls.length).toBeGreaterThan(0);
    });

    it('should render Avg Score label in candidate cards', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const avgCalls = textCalls.filter(
        (c: any[]) => c[0] === 'Avg Score'
      );
      expect(avgCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Role Fit PDF specific behavior', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,ROLE';"
      );
    });

    it('should render TARGET ROLE section', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const roleCalls = textCalls.filter(
        (c: any[]) => c[0] === 'TARGET ROLE'
      );
      expect(roleCalls.length).toBeGreaterThan(0);
    });

    it('should render Software Engineer role name', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const engCalls = textCalls.filter(
        (c: any[]) => c[0] === 'Software Engineer'
      );
      expect(engCalls.length).toBeGreaterThan(0);
    });

    it('should render overall fit percentage (85%)', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const fitPercent = textCalls.filter(
        (c: any[]) => c[0] === '85%'
      );
      expect(fitPercent.length).toBeGreaterThan(0);
    });

    it('should render Excellent Fit label for score >= 80', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const fitLabel = textCalls.filter(
        (c: any[]) => c[0] === 'Excellent Fit'
      );
      expect(fitLabel.length).toBeGreaterThan(0);
    });

    it('should render checkmark for strengths', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const checkCalls = textCalls.filter(
        (c: any[]) => c[0] === '\u2713' || c[0] === '✓'
      );
      expect(checkCalls.length).toBeGreaterThan(0);
    });

    it('should render CANDIDATE label in role fit cover', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const candidateCalls = textCalls.filter(
        (c: any[]) => c[0] === 'CANDIDATE'
      );
      expect(candidateCalls.length).toBeGreaterThan(0);
    });

    it('should render Required skill levels', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const reqCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].startsWith('Required:')
      );
      expect(reqCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Individual PDF specific behavior', () => {
    beforeEach(() => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,IND';"
      );
    });

    it('should render CANDIDATE ASSESSMENT title', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const titleCalls = textCalls.filter(
        (c: any[]) => c[0] === 'CANDIDATE ASSESSMENT'
      );
      expect(titleCalls.length).toBeGreaterThan(0);
    });

    it('should render COMPREHENSIVE REPORT subtitle', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const compCalls = textCalls.filter(
        (c: any[]) => c[0] === 'COMPREHENSIVE REPORT'
      );
      expect(compCalls.length).toBeGreaterThan(0);
    });

    it('should render Assessments Completed: 4', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const completedCalls = textCalls.filter(
        (c: any[]) => c[0] === 'Assessments Completed: 4'
      );
      expect(completedCalls.length).toBeGreaterThan(0);
    });

    it('should render Top Skill metric', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const topSkill = textCalls.filter(
        (c: any[]) => c[0] === 'Top Skill'
      );
      expect(topSkill.length).toBeGreaterThan(0);
    });

    it('should render prompt architecture score as /100 format', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const scoreCalls = textCalls.filter(
        (c: any[]) => c[0] === '82/100' || c[0] === '85/100'
      );
      expect(scoreCalls.length).toBeGreaterThan(0);
    });

    it('should render Overall Prompt Engineering Score label', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const promptLabel = textCalls.filter(
        (c: any[]) => c[0] === 'Overall Prompt Engineering Score'
      );
      expect(promptLabel.length).toBeGreaterThan(0);
    });

    it('should render AI Ethics & Responsibility Score label', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const aiqLabel = textCalls.filter(
        (c: any[]) => c[0] === 'AI Ethics & Responsibility Score'
      );
      expect(aiqLabel.length).toBeGreaterThan(0);
    });

    it('should render behavioral skills description', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const descCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('behavioral competencies')
      );
      expect(descCalls.length).toBeGreaterThan(0);
    });

    it('should render AI competencies description', async () => {
      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const descCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].includes('AI-specific competencies')
      );
      expect(descCalls.length).toBeGreaterThan(0);
    });
  });

  describe('getPerformanceLevel coverage', () => {
    it('should use all performance level colors based on sample scores', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,PERF';"
      );

      await import('../../server/generateSamplePDFs.ts');

      const colorCalls = mockPdfInstance.setTextColor.mock.calls;

      const excellentGreen = colorCalls.some(
        (c: number[]) => c[0] === 34 && c[1] === 197 && c[2] === 94
      );
      expect(excellentGreen).toBe(true);

      const goodBlue = colorCalls.some(
        (c: number[]) => c[0] === 59 && c[1] === 130 && c[2] === 246
      );
      expect(goodBlue).toBe(true);
    });
  });

  describe('Page overflow handling', () => {
    it('should handle page height boundary checks in score rendering', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,OVER';"
      );

      mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(100);

      await import('../../server/generateSamplePDFs.ts');

      const addPageCount = mockPdfInstance.addPage.mock.calls.length;
      expect(addPageCount).toBeGreaterThan(2);
    });
  });

  describe('Console logging during generation', () => {
    it('should log progress messages', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,LOG';"
      );

      const consoleSpy = vi.spyOn(console, 'log');

      await import('../../server/generateSamplePDFs.ts');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Generated date in PDFs', () => {
    it('should include Generated date text in comparison and rolefit PDFs', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,DATE';"
      );

      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const dateCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].startsWith('Generated:')
      );
      expect(dateCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison PDF - AI Readiness skill name truncation', () => {
    it('should truncate long skill names in AI Readiness comparison', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,TRUNC';"
      );

      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const truncatedCalls = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('...')
      );
      expect(truncatedCalls.length).toBeGreaterThan(0);
    });
  });

  describe('Comparison PDF - candidate name truncation', () => {
    it('should handle candidate name shortening for table headers', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,NAME';"
      );

      await import('../../server/generateSamplePDFs.ts');

      const textCalls = mockPdfInstance.text.mock.calls;
      const shortNames = textCalls.filter(
        (c: any[]) => typeof c[0] === 'string' && c[0].endsWith('.')
      );
      expect(shortNames.length).toBeGreaterThan(0);
    });
  });

  describe('CANDIDATE_COLORS usage', () => {
    it('should use blue and green candidate colors', async () => {
      mockReadFileSync.mockReturnValue(
        "export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,CLR';"
      );

      await import('../../server/generateSamplePDFs.ts');

      const drawCalls = mockPdfInstance.setDrawColor.mock.calls;
      const textCalls = mockPdfInstance.setTextColor.mock.calls;

      const blueDrawCalls = drawCalls.filter(
        (c: number[]) => c[0] === 59 && c[1] === 130 && c[2] === 246
      );
      const greenColorUsed = textCalls.some(
        (c: number[]) => c[0] === 34 && c[1] === 197 && c[2] === 94
      );

      expect(blueDrawCalls.length).toBeGreaterThan(0);
      expect(greenColorUsed).toBe(true);
    });
  });
});
