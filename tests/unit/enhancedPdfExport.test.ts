// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCanvas = {
  toDataURL: vi.fn().mockReturnValue('data:image/png;base64,mockcanvasdata'),
  width: 800,
  height: 600,
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
  output: vi.fn().mockReturnValue(new Blob(['pdf-content'])),
  save: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(20),
  getStringUnitWidth: vi.fn().mockReturnValue(5),
  splitTextToSize: vi.fn((text: string) => [text]),
  getNumberOfPages: vi.fn().mockReturnValue(4),
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
    width: 800,
    height: 600,
    getContext: vi.fn().mockReturnValue({ drawImage: vi.fn(), scale: vi.fn() }),
  }),
}));

vi.mock('@/lib/pdfAssets', () => ({
  HUMANMETRIX_LOGO_BASE64: 'data:image/png;base64,mocklogodata',
}));

vi.mock('@/lib/pdfStyles', () => ({
  applyBodyText: vi.fn(),
  applySubheading: vi.fn(),
  applyHeading: vi.fn(),
  applySmallText: vi.fn(),
  applyLabelText: vi.fn(),
  PDF_SPACING: { section: 16, subsection: 10, paragraph: 8, line: 5 },
  savePdfMobile: vi.fn(),
}));

vi.mock('@/lib/assessmentSkills', () => ({
  FIT_SKILLS: [
    { key: 'highAgency', displayName: 'High Agency', description: 'Proactive initiative' },
    { key: 'resilience', displayName: 'Resilience', description: 'Bouncing back' },
    { key: 'growthMindset', displayName: 'Growth Mindset', description: 'Continuous improvement' },
    { key: 'empathyEthics', displayName: 'Empathy & Ethics', description: 'Ethical awareness' },
    { key: 'intellectualCuriosity', displayName: 'Intellectual Curiosity', description: 'Drive to learn' },
    { key: 'interpersonalAgility', displayName: 'Interpersonal Agility', description: 'Social adaptability' },
  ],
  AI_READINESS_SKILLS: [
    { key: 'aiLiteracy', displayName: 'AI Literacy & Prompt Engineering', description: 'AI understanding' },
    { key: 'changeAdaptability', displayName: 'Change Adaptability', description: 'Adapting to change' },
    { key: 'collaboration', displayName: 'Collaboration & Communication', description: 'Teamwork' },
    { key: 'dataFluency', displayName: 'Data Fluency', description: 'Data handling' },
    { key: 'responsibleAI', displayName: 'Responsible AI', description: 'AI ethics' },
    { key: 'technicalFundamentals', displayName: 'Technical Fundamentals', description: 'Tech basics' },
    { key: 'criticalThinking', displayName: 'Critical Thinking', description: 'Problem solving' },
    { key: 'adaptiveLearning', displayName: 'Adaptive Learning', description: 'Learning agility' },
    { key: 'creativeInnovation', displayName: 'Creativity & Innovation', description: 'Creative thinking' },
  ],
}));

vi.mock('@/data/aiq-questions', () => ({
  getAIQBandInterpretation: vi.fn().mockReturnValue({
    band: 'Proficient',
    title: 'Proficient',
    description: 'Strong ethical awareness',
    recommendations: ['Continue developing ethical judgment'],
  }),
}));

vi.mock('@/components/SkillsLegend', () => ({
  PROMPT_ARCHITECTURE_DIMENSIONS: [
    { displayName: 'Clarity', description: 'Clear prompts' },
    { displayName: 'Structure', description: 'Well-structured prompts' },
    { displayName: 'Context Relevance', description: 'Relevant context' },
    { displayName: 'Creativity', description: 'Creative prompting' },
    { displayName: 'Iterative Improvement', description: 'Refining prompts' },
  ],
  AIQ_BANDS: [
    { range: '81-100', title: 'Highly Developed', description: 'Exemplary' },
    { range: '61-80', title: 'Proficient', description: 'Strong' },
    { range: '41-60', title: 'Developing', description: 'Growing' },
    { range: '21-40', title: 'Emerging', description: 'Early' },
    { range: '0-20', title: 'Foundational', description: 'Beginning' },
  ],
}));

import {
  exportEnhancedCandidatePDF,
  captureRadarChart,
} from '@/lib/enhancedPdfExport';

function resetMocks() {
  Object.values(mockPdfInstance).forEach((val) => {
    if (typeof val === 'function' && 'mockClear' in val) {
      (val as any).mockClear();
    }
  });
  mockPdfInstance.getNumberOfPages.mockReturnValue(4);
  mockPdfInstance.splitTextToSize.mockImplementation((text: string) => [text]);
  mockPdfInstance.internal.pageSize.getWidth.mockReturnValue(210);
  mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(297);
  mockPdfInstance.getTextWidth.mockReturnValue(20);
  mockPdfInstance.getStringUnitWidth.mockReturnValue(5);
}

const makeCandidate = (overrides: any = {}) => ({
  user: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  results: [
    { assessmentType: 'fit', status: 'completed', scores: { 'High Agency': 80, 'Resilience': 70, 'Growth Mindset': 85 } },
    { assessmentType: 'ai_readiness', status: 'completed', scores: { 'AI Literacy': 90, 'Data Fluency': 75 } },
    { assessmentType: 'prompt_architecture', status: 'completed', totalScore: 76, scores: { overall: 76 } },
    { assessmentType: 'aiq', status: 'completed', totalScore: 72, scores: { 'Algorithmic Integrity': 72 } },
  ],
  ...overrides,
});

const makeSkills = () => [
  { name: 'High Agency', score: 80, assessment: 'fit' },
  { name: 'Resilience', score: 70, assessment: 'fit' },
  { name: 'AI Literacy', score: 90, assessment: 'ai_readiness' },
  { name: 'Data Fluency', score: 75, assessment: 'ai_readiness' },
];

const makePlatformAverages = () => ({
  totalCandidates: 500,
  avgScoreAcrossCandidates: 68,
  skillAverages: {
    'High Agency': 65,
    'Resilience': 60,
    'AI Literacy': 70,
    'Data Fluency': 55,
  },
});

const makeRoleComparison = (overrides: any = {}) => ({
  role: { name: 'Software Engineer', description: 'Builds software' },
  alignment: {
    overallFit: 78,
    skillAlignments: [
      { skillName: 'High Agency', candidateScore: 80, requiredScore: 70, gap: -10, alignment: 'excellent' },
      { skillName: 'Resilience', candidateScore: 70, requiredScore: 75, gap: 5, alignment: 'good' },
    ],
    strengths: ['Leadership', 'Technical skills', 'Problem solving'],
    gaps: ['Communication', 'Documentation'],
    recommendations: 'Strong candidate overall.',
  },
  ...overrides,
});

const makePromptArchData = (count = 3) =>
  Array.from({ length: count }, (_, i) => ({
    level: i + 1,
    userPrompt: `Test prompt level ${i + 1}`,
    aiResponse: `Response for level ${i + 1}`,
    evaluationScores: {
      clarity: 60 + i * 5,
      structure: 55 + i * 5,
      contextRelevance: 50 + i * 5,
      creativity: 65 + i * 5,
      iterativeImprovement: 45 + i * 5,
    },
    totalScore: 55 + i * 5,
    feedback: `Feedback for level ${i + 1}`,
  }));

describe('enhancedPdfExport', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('exportEnhancedCandidatePDF - basic generation', () => {
    it('should create a PDF without errors with valid data', async () => {
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });

    it('should call savePdfMobile with correct filename format', async () => {
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(savePdfMobile).toHaveBeenCalledWith(
        mockPdfInstance,
        expect.stringMatching(/^humanmetrix-report-john-doe-\d{4}-\d{2}-\d{2}\.pdf$/)
      );
    });

    it('should add the HUMANMETRIX logo image', async () => {
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should create multiple pages', async () => {
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - candidate name handling', () => {
    it('should handle candidate without first name', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ user: { email: 'anon@example.com' } }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only last name', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ user: { lastName: 'Smith', email: 'smith@example.com' } }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only first name', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ user: { firstName: 'Jane', email: 'jane@example.com' } }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should default to Candidate when no name provided', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ user: { email: 'test@test.com' } }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should include role label in filename when role comparison provided', async () => {
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison()
      );
      expect(savePdfMobile).toHaveBeenCalledWith(
        mockPdfInstance,
        expect.stringContaining('software-engineer')
      );
    });
  });

  describe('exportEnhancedCandidatePDF - skills handling', () => {
    it('should handle empty skills array', async () => {
      await exportEnhancedCandidatePDF(makeCandidate(), [], makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle many skills for skills table', async () => {
      const manySkills = Array.from({ length: 20 }, (_, i) => ({
        name: `Skill ${i + 1}`,
        score: 50 + i * 2,
        assessment: i < 10 ? 'FIT Assessment' : 'AI Readiness',
      }));
      await exportEnhancedCandidatePDF(makeCandidate(), manySkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with very long names', async () => {
      const longNameSkills = [
        { name: 'A Very Long Skill Name That Exceeds Thirty Characters Easily', score: 75, assessment: 'fit' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), longNameSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with score 0', async () => {
      const zeroSkills = [{ name: 'Zero Skill', score: 0, assessment: 'fit' }];
      await exportEnhancedCandidatePDF(makeCandidate(), zeroSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with score 100', async () => {
      const perfectSkills = [{ name: 'Perfect Skill', score: 100, assessment: 'fit' }];
      await exportEnhancedCandidatePDF(makeCandidate(), perfectSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle only FIT assessment skills', async () => {
      const fitOnly = [
        { name: 'High Agency', score: 80, assessment: 'FIT Assessment' },
        { name: 'Resilience', score: 65, assessment: 'FIT Assessment' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), fitOnly, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle only AI Readiness skills', async () => {
      const aiOnly = [
        { name: 'AI Literacy', score: 90, assessment: 'AI Readiness' },
        { name: 'Data Fluency', score: 70, assessment: 'AI Readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), aiOnly, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - radar chart images', () => {
    it('should handle both radar chart images', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        { fit: 'data:image/png;base64,fitchart', aiReadiness: 'data:image/png;base64,aichart' }
      );
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle only FIT radar chart', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        { fit: 'data:image/png;base64,fitchart' }
      );
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle only AI readiness radar chart', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        { aiReadiness: 'data:image/png;base64,aichart' }
      );
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle undefined radar chart images', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty radar chart images object', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        {}
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - role comparison', () => {
    it('should handle role comparison data', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role comparison with high overall fit (>=80)', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison({
          alignment: {
            overallFit: 92,
            skillAlignments: [],
            strengths: ['Everything'],
            gaps: [],
            recommendations: 'Excellent match.',
          },
        })
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role comparison with low overall fit (<60)', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison({
          alignment: {
            overallFit: 35,
            skillAlignments: [],
            strengths: [],
            gaps: ['Many gaps'],
            recommendations: 'Needs significant development.',
          },
        })
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role comparison with empty alignments', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison({
          alignment: {
            overallFit: 50,
            skillAlignments: [],
            strengths: [],
            gaps: [],
            recommendations: '',
          },
        })
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role comparison with many skill alignments', async () => {
      const manyAlignments = Array.from({ length: 15 }, (_, i) => ({
        skillName: `Skill ${i + 1}`,
        candidateScore: 50 + i * 3,
        requiredScore: 60 + i * 2,
        gap: i % 2 === 0 ? -5 : 5,
        alignment: i % 3 === 0 ? 'excellent' : i % 3 === 1 ? 'good' : 'developing',
      }));
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison({
          alignment: {
            overallFit: 65,
            skillAlignments: manyAlignments,
            strengths: ['Strength 1', 'Strength 2', 'Strength 3', 'Strength 4', 'Strength 5', 'Strength 6'],
            gaps: ['Gap 1', 'Gap 2', 'Gap 3', 'Gap 4', 'Gap 5', 'Gap 6'],
            recommendations: 'Consider with development plan.',
          },
        })
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role comparison with very long skill names', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        makeRoleComparison({
          alignment: {
            overallFit: 70,
            skillAlignments: [
              { skillName: 'A Very Long And Extremely Detailed Skill Name', candidateScore: 60, requiredScore: 70, gap: 10, alignment: 'developing' },
            ],
            strengths: ['Strong'],
            gaps: ['Weak'],
            recommendations: 'Ok.',
          },
        })
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - prompt architecture', () => {
    it('should handle prompt architecture data', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        undefined,
        makePromptArchData(3)
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt architecture with many levels (7)', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        undefined,
        makePromptArchData(7)
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt architecture with no completed levels', async () => {
      const incompletePrompts = [
        { level: 1, userPrompt: 'Hello' },
        { level: 2, userPrompt: 'World' },
      ];
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        undefined,
        incompletePrompts as any
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty prompt architecture array', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        undefined,
        []
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt architecture with single completed level', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        undefined,
        undefined,
        [{ level: 1, userPrompt: 'Hello', totalScore: 50, feedback: 'OK' }]
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - candidate results', () => {
    it('should handle candidate with no completed results', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ results: [] }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only FIT completed', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ results: [{ assessmentType: 'fit', status: 'completed', scores: { 'High Agency': 80 } }] }),
        [{ name: 'High Agency', score: 80, assessment: 'fit' }],
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with AIQ result having scores object fallback', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({
          results: [
            { assessmentType: 'aiq', status: 'completed', scores: { 'Algorithmic Integrity': 65 } },
          ],
        }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with pending results (not completed)', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({
          results: [
            { assessmentType: 'fit', status: 'pending', scores: {} },
            { assessmentType: 'ai_readiness', status: 'in_progress', scores: {} },
          ],
        }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with null results', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ results: undefined }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - metadata (tags, notes)', () => {
    it('should handle candidate with tags', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ tags: [{ tag: 'senior' }, { tag: 'engineering' }] }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with notes', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ notes: [{ note: 'Great interview', createdAt: '2025-01-01' }] }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with empty tags and notes', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({ tags: [], notes: [] }),
        makeSkills(),
        makePlatformAverages()
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - platform averages', () => {
    it('should handle zero platform averages', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        { totalCandidates: 0, avgScoreAcrossCandidates: 0, skillAverages: {} }
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle high platform averages', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        { totalCandidates: 1000, avgScoreAcrossCandidates: 95, skillAverages: { 'High Agency': 95, 'AI Literacy': 98 } }
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - score ranges and performance levels', () => {
    it('should handle high-scoring candidate (>=85 Exceptional)', async () => {
      const highSkills = [
        { name: 'High Agency', score: 95, assessment: 'fit' },
        { name: 'AI Literacy', score: 98, assessment: 'ai_readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), highSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle mid-scoring candidate (70-84 Strong)', async () => {
      const midSkills = [
        { name: 'High Agency', score: 75, assessment: 'fit' },
        { name: 'AI Literacy', score: 78, assessment: 'ai_readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), midSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low-scoring candidate (<40 Needs Development)', async () => {
      const lowSkills = [
        { name: 'High Agency', score: 15, assessment: 'fit' },
        { name: 'AI Literacy', score: 10, assessment: 'ai_readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), lowSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle developing range candidate (40-54)', async () => {
      const devSkills = [
        { name: 'High Agency', score: 42, assessment: 'fit' },
        { name: 'AI Literacy', score: 48, assessment: 'ai_readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), devSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle competent range candidate (55-69)', async () => {
      const compSkills = [
        { name: 'High Agency', score: 60, assessment: 'fit' },
        { name: 'AI Literacy', score: 65, assessment: 'ai_readiness' },
      ];
      await exportEnhancedCandidatePDF(makeCandidate(), compSkills, makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - all optional params combined', () => {
    it('should handle all optional parameters together', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate(),
        makeSkills(),
        makePlatformAverages(),
        { fit: 'data:image/png;base64,fit', aiReadiness: 'data:image/png;base64,ai' },
        makeRoleComparison(),
        makePromptArchData(3)
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all optional parameters with complex data', async () => {
      await exportEnhancedCandidatePDF(
        makeCandidate({
          tags: [{ tag: 'priority' }],
          notes: [{ note: 'Follow up', createdAt: '2025-03-01' }],
        }),
        Array.from({ length: 15 }, (_, i) => ({
          name: `Skill ${i}`,
          score: 40 + i * 4,
          assessment: i < 6 ? 'FIT Assessment' : 'AI Readiness',
        })),
        makePlatformAverages(),
        { fit: 'data:image/png;base64,chartdata' },
        makeRoleComparison(),
        makePromptArchData(5)
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportEnhancedCandidatePDF - page numbering', () => {
    it('should set page numbers for all pages', async () => {
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
      expect(mockPdfInstance.getNumberOfPages).toHaveBeenCalled();
    });

    it('should iterate through all pages for footers', async () => {
      mockPdfInstance.getNumberOfPages.mockReturnValue(6);
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.setPage).toHaveBeenCalledTimes(6);
    });
  });

  describe('exportEnhancedCandidatePDF - error resilience', () => {
    it('should handle addImage throwing for logo gracefully', async () => {
      mockPdfInstance.addImage.mockImplementationOnce(() => {
        throw new Error('Image load failed');
      });
      await exportEnhancedCandidatePDF(makeCandidate(), makeSkills(), makePlatformAverages());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('captureRadarChart', () => {
    it('should return null when element not found', async () => {
      const result = await captureRadarChart('non-existent-element');
      expect(result).toBeNull();
    });

    it('should capture element and return data URL', async () => {
      const testEl = document.createElement('div');
      testEl.id = 'test-chart-capture';
      Object.defineProperty(testEl, 'offsetWidth', { value: 400 });
      Object.defineProperty(testEl, 'offsetHeight', { value: 300 });
      document.body.appendChild(testEl);

      Object.defineProperty(document, 'fonts', {
        value: { ready: Promise.resolve() },
        writable: true,
      });

      const result = await captureRadarChart('test-chart-capture');
      expect(result).toBe('data:image/png;base64,mockcanvasdata');

      document.body.removeChild(testEl);
    });

    it('should return null when html2canvas throws', async () => {
      const testEl = document.createElement('div');
      testEl.id = 'error-chart-capture';
      Object.defineProperty(testEl, 'offsetWidth', { value: 400 });
      Object.defineProperty(testEl, 'offsetHeight', { value: 300 });
      document.body.appendChild(testEl);

      Object.defineProperty(document, 'fonts', {
        value: { ready: Promise.resolve() },
        writable: true,
      });

      const html2canvasMod = await import('html2canvas');
      (html2canvasMod.default as any).mockRejectedValueOnce(new Error('Canvas error'));

      const result = await captureRadarChart('error-chart-capture');
      expect(result).toBeNull();

      document.body.removeChild(testEl);
    });

    it('should pass correct options to html2canvas', async () => {
      const testEl = document.createElement('div');
      testEl.id = 'options-chart';
      Object.defineProperty(testEl, 'offsetWidth', { value: 500 });
      Object.defineProperty(testEl, 'offsetHeight', { value: 400 });
      document.body.appendChild(testEl);

      Object.defineProperty(document, 'fonts', {
        value: { ready: Promise.resolve() },
        writable: true,
      });

      const html2canvasMod = await import('html2canvas');
      await captureRadarChart('options-chart');

      expect(html2canvasMod.default).toHaveBeenCalledWith(testEl, expect.objectContaining({
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      }));

      document.body.removeChild(testEl);
    });
  });
});
