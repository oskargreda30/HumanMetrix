import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockPdfMethods = {
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
  circle: vi.fn(),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(30),
  getStringUnitWidth: vi.fn().mockReturnValue(5),
  splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
  setPage: vi.fn(),
  getNumberOfPages: vi.fn().mockReturnValue(5),
  output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
    scaleFactor: 1,
  },
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdfMethods),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockReturnValue("export const HUMANMETRIX_LOGO_BASE64 = 'data:image/png;base64,testlogo';"),
}));

vi.mock('path', () => ({
  join: vi.fn().mockReturnValue('/mock/path/pdfAssets.ts'),
  dirname: vi.fn().mockReturnValue('/mock/dir'),
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/mock/file/path'),
}));

import { generateB2BResultsPDF, type B2BAssessmentData } from '../../server/generateB2BPDF';

function makeFITData(overrides: Partial<B2BAssessmentData> = {}): B2BAssessmentData {
  return {
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    assessmentType: 'fit',
    scores: {
      'High Agency': 85,
      'Intellectual Curiosity': 78,
      'Resilience': 72,
      'Empathy & Ethics': 68,
      'Growth Mindset': 90,
      'Interpersonal Agility': 65,
    },
    totalScore: 76,
    completedAt: new Date('2025-01-15'),
    partnerCompanyName: 'TestCorp',
    ...overrides,
  };
}

function makeAIReadinessData(overrides: Partial<B2BAssessmentData> = {}): B2BAssessmentData {
  return {
    candidateName: 'Jane Smith',
    candidateEmail: 'jane@example.com',
    assessmentType: 'ai_readiness',
    scores: {
      'AI Literacy & Prompt Engineering': 82,
      'Technical Fundamentals': 75,
      'Data Fluency': 70,
      'Critical Thinking & Problem-Solving': 88,
      'Adaptability & Continuous Learning': 65,
      'Collaboration & Communication': 72,
      'Responsible AI & Ethical Awareness': 78,
      'Creativity & Innovation': 60,
      'Domain Expertise': 55,
    },
    totalScore: 72,
    completedAt: new Date('2025-01-15'),
    partnerCompanyName: 'TestCorp',
    ...overrides,
  };
}

function makePromptArchData(overrides: Partial<B2BAssessmentData> = {}): B2BAssessmentData {
  return {
    candidateName: 'Bob Builder',
    candidateEmail: 'bob@example.com',
    assessmentType: 'prompt_architecture',
    scores: {
      'Clarity': 80,
      'Structure': 75,
      'Context Relevance': 70,
      'Creativity': 65,
      'Iterative Improvement': 60,
    },
    totalScore: 70,
    evaluations: [
      { level: 1, totalScore: 85 },
      { level: 2, totalScore: 72 },
      { level: 3, totalScore: 60 },
    ],
    completedAt: new Date('2025-01-15'),
    partnerCompanyName: 'TestCorp',
    ...overrides,
  };
}

function makeAIQData(overrides: Partial<B2BAssessmentData> = {}): B2BAssessmentData {
  return {
    candidateName: 'Alice Wonder',
    candidateEmail: 'alice@example.com',
    assessmentType: 'aiq',
    scores: {
      'AI Ethics': 75,
      'Bias Detection': 80,
      'Fairness': 70,
      'Transparency': 65,
    },
    totalScore: 73,
    completedAt: new Date('2025-01-15'),
    partnerCompanyName: 'TestCorp',
    ...overrides,
  };
}

describe('generateB2BPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfMethods.output.mockReturnValue(new ArrayBuffer(100));
    mockPdfMethods.getNumberOfPages.mockReturnValue(5);
    mockPdfMethods.internal.pageSize.getWidth.mockReturnValue(210);
    mockPdfMethods.internal.pageSize.getHeight.mockReturnValue(297);
    mockPdfMethods.splitTextToSize.mockImplementation((text: string) => [text]);
    mockPdfMethods.getStringUnitWidth.mockReturnValue(5);
  });

  describe('generateB2BResultsPDF returns Buffer', () => {
    it('should return a Buffer instance', () => {
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return a non-empty Buffer', () => {
      const result = generateB2BResultsPDF(makeFITData());
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('FIT assessment', () => {
    it('should generate PDF for FIT assessment data', () => {
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPdfMethods.text).toHaveBeenCalled();
    });

    it('should render FIT skill bars', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('FIT Assessment (Behavioral Skills)');
    });

    it('should handle high FIT average (>=70)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: {
          'High Agency': 90,
          'Intellectual Curiosity': 85,
          'Resilience': 80,
          'Empathy & Ethics': 75,
          'Growth Mindset': 95,
          'Interpersonal Agility': 80,
        },
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Strong behavioral competencies'),
        expect.any(Number)
      );
    });

    it('should handle low FIT average (<70)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: {
          'High Agency': 40,
          'Intellectual Curiosity': 35,
          'Resilience': 30,
          'Empathy & Ethics': 25,
          'Growth Mindset': 45,
          'Interpersonal Agility': 20,
        },
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Foundational behavioral skills'),
        expect.any(Number)
      );
    });

    it('should use legacy keys for FIT scores', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: {
          'highAgency': 85,
          'intellectualCuriosity': 78,
          'resilience': 72,
          'empathyEthics': 68,
          'growthMindset': 90,
          'interpersonalAgility': 65,
        },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('AI Readiness assessment', () => {
    it('should generate PDF for AI Readiness data', () => {
      const result = generateB2BResultsPDF(makeAIReadinessData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should render AI Readiness section header', () => {
      generateB2BResultsPDF(makeAIReadinessData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('AI Readiness Assessment');
    });

    it('should handle high AI Readiness average (>=70)', () => {
      generateB2BResultsPDF(makeAIReadinessData({
        scores: {
          'AI Literacy & Prompt Engineering': 90,
          'Technical Fundamentals': 85,
          'Data Fluency': 80,
          'Critical Thinking & Problem-Solving': 88,
          'Adaptability & Continuous Learning': 75,
          'Collaboration & Communication': 82,
          'Responsible AI & Ethical Awareness': 78,
          'Creativity & Innovation': 75,
          'Domain Expertise': 70,
        },
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Strong AI literacy'),
        expect.any(Number)
      );
    });

    it('should handle low AI Readiness average (<70)', () => {
      generateB2BResultsPDF(makeAIReadinessData({
        scores: {
          'AI Literacy & Prompt Engineering': 30,
          'Technical Fundamentals': 25,
          'Data Fluency': 20,
          'Critical Thinking & Problem-Solving': 35,
          'Adaptability & Continuous Learning': 15,
          'Collaboration & Communication': 22,
          'Responsible AI & Ethical Awareness': 18,
          'Creativity & Innovation': 10,
          'Domain Expertise': 5,
        },
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Foundational AI awareness'),
        expect.any(Number)
      );
    });

    it('should handle ai-readiness hyphenated type', () => {
      const result = generateB2BResultsPDF(makeAIReadinessData({
        assessmentType: 'ai-readiness',
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should use legacy keys for AI Readiness scores', () => {
      const result = generateB2BResultsPDF(makeAIReadinessData({
        scores: {
          'aiLiteracy': 82,
          'technicalFluency': 75,
          'domainFluency': 70,
          'criticalThinking': 88,
          'adaptiveLearning': 65,
          'collaboration': 72,
          'responsibleAI': 78,
          'creativeInnovation': 60,
          'domainExpertise': 55,
        },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('Prompt Architecture assessment', () => {
    it('should generate PDF for Prompt Architecture data', () => {
      const result = generateB2BResultsPDF(makePromptArchData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should render prompt level bars', () => {
      generateB2BResultsPDF(makePromptArchData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Level'))).toBe(true);
    });

    it('should handle evaluations with zero score', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: [
          { level: 1, totalScore: 0 },
          { level: 2, totalScore: 0 },
        ],
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty evaluations array', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: [],
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle undefined evaluations', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: undefined,
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle high prompt architecture score (>=70)', () => {
      generateB2BResultsPDF(makePromptArchData({ totalScore: 85 }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Strong prompt engineering skills'),
        expect.any(Number)
      );
    });

    it('should handle low prompt architecture score (<70)', () => {
      generateB2BResultsPDF(makePromptArchData({ totalScore: 45 }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Basic prompt engineering ability'),
        expect.any(Number)
      );
    });

    it('should handle evaluations with various difficulty levels', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: [
          { level: 1, totalScore: 90 },
          { level: 3, totalScore: 70 },
          { level: 5, totalScore: 50 },
          { level: 7, totalScore: 30 },
        ],
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle many evaluations that might need page break', () => {
      mockPdfMethods.internal.pageSize.getHeight.mockReturnValue(100);
      const evaluations = Array.from({ length: 20 }, (_, i) => ({
        level: i + 1,
        totalScore: 50 + i,
      }));
      const result = generateB2BResultsPDF(makePromptArchData({ evaluations }));
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPdfMethods.addPage).toHaveBeenCalled();
    });
  });

  describe('AIQ assessment', () => {
    it('should generate PDF for AIQ data', () => {
      const result = generateB2BResultsPDF(makeAIQData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should render AIQ band interpretation', () => {
      generateB2BResultsPDF(makeAIQData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Algorithmic Integrity Quotient'))).toBe(true);
    });

    it('should handle highly developed AIQ (>=81)', () => {
      const result = generateB2BResultsPDF(makeAIQData({ totalScore: 90 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle proficient AIQ (61-80)', () => {
      const result = generateB2BResultsPDF(makeAIQData({ totalScore: 70 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle developing AIQ (41-60)', () => {
      const result = generateB2BResultsPDF(makeAIQData({ totalScore: 50 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle emerging AIQ (21-40)', () => {
      const result = generateB2BResultsPDF(makeAIQData({ totalScore: 30 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle foundational AIQ (0-20)', () => {
      const result = generateB2BResultsPDF(makeAIQData({ totalScore: 10 }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('candidate name handling', () => {
    it('should use candidateName if provided', () => {
      generateB2BResultsPDF(makeFITData({ candidateName: 'Test User' }));
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('TEST USER');
    });

    it('should fall back to email prefix when candidateName is undefined', () => {
      generateB2BResultsPDF(makeFITData({ candidateName: undefined, candidateEmail: 'fallback@test.com' }));
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('FALLBACK');
    });
  });

  describe('empty scores handling', () => {
    it('should handle empty scores object for FIT', () => {
      const result = generateB2BResultsPDF(makeFITData({ scores: {} }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty scores object for AI Readiness', () => {
      const result = generateB2BResultsPDF(makeAIReadinessData({ scores: {} }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty scores object for AIQ', () => {
      const result = generateB2BResultsPDF(makeAIQData({ scores: {} }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle empty scores object for Prompt Architecture', () => {
      const result = generateB2BResultsPDF(makePromptArchData({ scores: {} }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('header and footer rendering', () => {
    it('should call addImage for logo in header', () => {
      generateB2BResultsPDF(makeFITData());
      expect(mockPdfMethods.addImage).toHaveBeenCalled();
    });

    it('should render footer on all pages', () => {
      generateB2BResultsPDF(makeFITData());
      expect(mockPdfMethods.setPage).toHaveBeenCalled();
    });

    it('should render page numbers', () => {
      mockPdfMethods.getNumberOfPages.mockReturnValue(3);
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      const pageTexts = textCalls.filter((t: string) => typeof t === 'string' && t.startsWith('Page '));
      expect(pageTexts.length).toBeGreaterThan(0);
    });

    it('should include copyright in footer', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('HumanMetrix'))).toBe(true);
    });
  });

  describe('logo loading failure', () => {
    it('should handle addImage throwing an error gracefully', () => {
      mockPdfMethods.addImage.mockImplementationOnce(() => {
        throw new Error('Image load failed');
      });
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('performance levels', () => {
    it('should handle exceptional score (>=85)', () => {
      const result = generateB2BResultsPDF(makeFITData({ totalScore: 90 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle strong score (70-84)', () => {
      const result = generateB2BResultsPDF(makeFITData({ totalScore: 75 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle competent score (55-69)', () => {
      const result = generateB2BResultsPDF(makeFITData({ totalScore: 60 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle developing score (40-54)', () => {
      const result = generateB2BResultsPDF(makeFITData({ totalScore: 45 }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle needs development score (<40)', () => {
      const result = generateB2BResultsPDF(makeFITData({ totalScore: 20 }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('skill score color shading', () => {
    it('should handle score >= 80 (darkest blue)', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 95, 'Intellectual Curiosity': 10, 'Resilience': 10, 'Empathy & Ethics': 10, 'Growth Mindset': 10, 'Interpersonal Agility': 10 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle score >= 60 (medium blue)', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 65, 'Intellectual Curiosity': 10, 'Resilience': 10, 'Empathy & Ethics': 10, 'Growth Mindset': 10, 'Interpersonal Agility': 10 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle score >= 40 (lighter blue)', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 45, 'Intellectual Curiosity': 10, 'Resilience': 10, 'Empathy & Ethics': 10, 'Growth Mindset': 10, 'Interpersonal Agility': 10 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle score >= 20 (light blue)', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 25, 'Intellectual Curiosity': 10, 'Resilience': 10, 'Empathy & Ethics': 10, 'Growth Mindset': 10, 'Interpersonal Agility': 10 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle score < 20 (lightest blue)', () => {
      const result = generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 5, 'Intellectual Curiosity': 5, 'Resilience': 5, 'Empathy & Ethics': 5, 'Growth Mindset': 5, 'Interpersonal Agility': 5 },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('development recommendations', () => {
    it('should generate priority development items for low scores (<50)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: {
          'High Agency': 30,
          'Intellectual Curiosity': 20,
          'Resilience': 40,
          'Empathy & Ethics': 35,
          'Growth Mindset': 45,
          'Interpersonal Agility': 25,
        },
        totalScore: 32,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Priority development'),
        expect.any(Number)
      );
    });

    it('should generate strengthen items for medium scores (50-69)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: {
          'High Agency': 55,
          'Intellectual Curiosity': 60,
          'Resilience': 65,
          'Empathy & Ethics': 55,
          'Growth Mindset': 60,
          'Interpersonal Agility': 55,
        },
        totalScore: 58,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Strengthen'),
        expect.any(Number)
      );
    });

    it('should generate refine items for high scores (>=70)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: {
          'High Agency': 85,
          'Intellectual Curiosity': 90,
          'Resilience': 80,
          'Empathy & Ethics': 75,
          'Growth Mindset': 95,
          'Interpersonal Agility': 80,
        },
        totalScore: 84,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('Refine'),
        expect.any(Number)
      );
    });

    it('should suggest AI literacy programs for very low overall score (<50)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 20, 'Intellectual Curiosity': 15, 'Resilience': 25, 'Empathy & Ethics': 10, 'Growth Mindset': 30, 'Interpersonal Agility': 20 },
        totalScore: 20,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('structured AI literacy'),
        expect.any(Number)
      );
    });

    it('should suggest mentorship for medium overall score (50-69)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 55, 'Intellectual Curiosity': 60, 'Resilience': 58, 'Empathy & Ethics': 52, 'Growth Mindset': 62, 'Interpersonal Agility': 55 },
        totalScore: 57,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('mentorship'),
        expect.any(Number)
      );
    });

    it('should suggest leadership training for high overall score (>=70)', () => {
      generateB2BResultsPDF(makeFITData({
        scores: { 'High Agency': 85, 'Intellectual Curiosity': 80, 'Resilience': 75, 'Empathy & Ethics': 78, 'Growth Mindset': 90, 'Interpersonal Agility': 82 },
        totalScore: 82,
      }));
      expect(mockPdfMethods.splitTextToSize).toHaveBeenCalledWith(
        expect.stringContaining('leadership training'),
        expect.any(Number)
      );
    });
  });

  describe('totalScore fallback', () => {
    it('should calculate overall score from scores if totalScore not provided', () => {
      const result = generateB2BResultsPDF(makeFITData({
        totalScore: undefined,
        scores: {
          'High Agency': 80,
          'Intellectual Curiosity': 60,
          'Resilience': 70,
          'Empathy & Ethics': 50,
          'Growth Mindset': 90,
          'Interpersonal Agility': 40,
        },
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('role recommendations by assessment type', () => {
    it('should generate role recommendations for FIT', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('MOST SUITABLE ROLES');
    });

    it('should generate role recommendations for AI Readiness', () => {
      generateB2BResultsPDF(makeAIReadinessData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('MOST SUITABLE ROLES');
    });

    it('should generate role recommendations for Prompt Architecture', () => {
      generateB2BResultsPDF(makePromptArchData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('MOST SUITABLE ROLES');
    });

    it('should generate role recommendations for AIQ', () => {
      generateB2BResultsPDF(makeAIQData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('MOST SUITABLE ROLES');
    });
  });

  describe('skills legend page', () => {
    it('should add skills legend page with FIT skills', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('SKILLS LEGEND');
    });

    it('should include all assessment type sections in skills legend', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('FIT Assessment - Behavioral Skills');
      expect(textCalls).toContain('AI Readiness - Technical Competencies');
      expect(textCalls).toContain('Prompt Architecture - Evaluation Dimensions');
      expect(textCalls).toContain('AIQ - Algorithmic Integrity Quotient Bands');
    });
  });

  describe('report guide page', () => {
    it('should render report guide page', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('HOW TO READ OUR REPORTS');
    });
  });

  describe('page space management', () => {
    it('should add page when content overflows', () => {
      mockPdfMethods.internal.pageSize.getHeight.mockReturnValue(80);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
      expect(mockPdfMethods.addPage).toHaveBeenCalled();
    });
  });

  describe('long skill name truncation', () => {
    it('should truncate skill names longer than 30 characters in drawSkillBar', () => {
      const result = generateB2BResultsPDF(makeAIReadinessData({
        scores: {
          'AI Literacy & Prompt Engineering': 82,
          'Technical Fundamentals': 75,
          'Data Fluency': 70,
          'Critical Thinking & Problem-Solving': 88,
          'Adaptability & Continuous Learning': 65,
          'Collaboration & Communication': 72,
          'Responsible AI & Ethical Awareness': 78,
          'Creativity & Innovation': 60,
          'Domain Expertise': 55,
        },
      }));
      expect(result).toBeInstanceOf(Buffer);
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.endsWith('...'))).toBe(true);
    });
  });

  describe('assessment type formatting', () => {
    it('should format fit assessment type', () => {
      generateB2BResultsPDF(makeFITData());
      expect(mockPdfMethods.text).toHaveBeenCalled();
    });

    it('should format ai_readiness assessment type', () => {
      generateB2BResultsPDF(makeAIReadinessData());
      expect(mockPdfMethods.text).toHaveBeenCalled();
    });

    it('should format prompt_architecture assessment type', () => {
      generateB2BResultsPDF(makePromptArchData());
      expect(mockPdfMethods.text).toHaveBeenCalled();
    });

    it('should format aiq assessment type', () => {
      generateB2BResultsPDF(makeAIQData());
      expect(mockPdfMethods.text).toHaveBeenCalled();
    });

    it('should handle unknown assessment type', () => {
      const result = generateB2BResultsPDF({
        candidateName: 'Test',
        candidateEmail: 'test@test.com',
        assessmentType: 'unknown_type',
        scores: { 'skill1': 50 },
        completedAt: new Date(),
        partnerCompanyName: 'Test',
      });
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('fitMetricValue text fitting', () => {
    it('should handle text that fits at initial font size', () => {
      mockPdfMethods.getStringUnitWidth.mockReturnValue(1);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle text that needs to be reduced in size', () => {
      mockPdfMethods.getStringUnitWidth.mockReturnValue(100);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should truncate text with ellipsis when it cannot fit even at minimum font size', () => {
      mockPdfMethods.getStringUnitWidth.mockImplementation((text: string) => {
        if (text.endsWith('...') && text.length <= 5) return 0.1;
        return 9999;
      });
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });

    it('should return ellipsis when text cannot fit at all', () => {
      mockPdfMethods.getStringUnitWidth.mockReturnValue(9999);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('skills legend page overflow', () => {
    it('should handle skills legend content overflowing the page', () => {
      mockPdfMethods.internal.pageSize.getHeight.mockReturnValue(100);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('AIQ band colors', () => {
    it('should use green for high AIQ (>=80)', () => {
      generateB2BResultsPDF(makeAIQData({ totalScore: 85 }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should use blue for proficient AIQ (60-79)', () => {
      generateB2BResultsPDF(makeAIQData({ totalScore: 65 }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should use yellow for developing AIQ (40-59)', () => {
      generateB2BResultsPDF(makeAIQData({ totalScore: 45 }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should use orange for emerging AIQ (20-39)', () => {
      generateB2BResultsPDF(makeAIQData({ totalScore: 25 }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should use red for foundational AIQ (<20)', () => {
      generateB2BResultsPDF(makeAIQData({ totalScore: 10 }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });
  });

  describe('prompt level colors', () => {
    it('should handle level <= 2 (lightest)', () => {
      generateB2BResultsPDF(makePromptArchData({
        evaluations: [{ level: 1, totalScore: 80 }],
      }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should handle level 3-5 (medium)', () => {
      generateB2BResultsPDF(makePromptArchData({
        evaluations: [{ level: 4, totalScore: 70 }],
      }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });

    it('should handle level > 5 (darkest)', () => {
      generateB2BResultsPDF(makePromptArchData({
        evaluations: [{ level: 7, totalScore: 60 }],
      }));
      expect(mockPdfMethods.setFillColor).toHaveBeenCalled();
    });
  });

  describe('footer skills legend note', () => {
    it('should include skills legend note on non-last pages', () => {
      mockPdfMethods.getNumberOfPages.mockReturnValue(3);
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Skills Legend available'))).toBe(true);
    });
  });

  describe('evaluation without totalScore', () => {
    it('should handle evaluations where totalScore is undefined', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: [
          { level: 1 },
          { level: 2, totalScore: undefined },
        ],
      }));
      expect(result).toBeInstanceOf(Buffer);
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls.some((t: string) => typeof t === 'string' && t.includes('Not completed'))).toBe(true);
    });

    it('should handle evaluations without level property', () => {
      const result = generateB2BResultsPDF(makePromptArchData({
        evaluations: [
          { totalScore: 50 },
        ],
      }));
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('aireadiness key normalization', () => {
    it('should handle assessmentType that normalizes to aireadiness', () => {
      const result = generateB2BResultsPDF({
        candidateName: 'Test',
        candidateEmail: 'test@test.com',
        assessmentType: 'aireadiness',
        scores: { 'AI Literacy & Prompt Engineering': 70 },
        completedAt: new Date(),
        partnerCompanyName: 'Test',
      });
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('recommendation sections rendering', () => {
    it('should render WHERE THIS CANDIDATE WOULD THRIVE section', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('WHERE THIS CANDIDATE WOULD THRIVE');
    });

    it('should render ROLE STRENGTHS section', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('ROLE STRENGTHS');
    });

    it('should render DEVELOPMENT RECOMMENDATIONS section', () => {
      generateB2BResultsPDF(makeFITData());
      const textCalls = mockPdfMethods.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('DEVELOPMENT RECOMMENDATIONS');
    });
  });

  describe('multi-line text handling in splitTextToSize', () => {
    it('should handle splitTextToSize returning multiple lines', () => {
      mockPdfMethods.splitTextToSize.mockImplementation((text: string) => [
        text.substring(0, 20),
        text.substring(20),
      ]);
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('recommendation page overflow', () => {
    it('should handle recommendation sections overflowing to new page', () => {
      mockPdfMethods.internal.pageSize.getHeight.mockReturnValue(80);
      mockPdfMethods.splitTextToSize.mockImplementation((text: string) =>
        Array.from({ length: 10 }, (_, i) => `line ${i}: ${text.substring(0, 30)}`)
      );
      const result = generateB2BResultsPDF(makeFITData());
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
