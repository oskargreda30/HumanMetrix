// @vitest-environment jsdom
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
  output: vi.fn().mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' })),
  save: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(20),
  getStringUnitWidth: vi.fn().mockReturnValue(5),
  getImageProperties: vi.fn().mockReturnValue({ width: 400, height: 300 }),
  splitTextToSize: vi.fn((text: string) => [text]),
  getNumberOfPages: vi.fn().mockReturnValue(3),
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
    { key: 'highAgency', displayName: 'High Agency', description: 'Proactive initiative-taking' },
    { key: 'intellectualCuriosity', displayName: 'Intellectual Curiosity', description: 'Drive to learn' },
    { key: 'resilience', displayName: 'Resilience', description: 'Ability to bounce back' },
    { key: 'empathyEthics', displayName: 'Empathy & Ethics', description: 'Ethical awareness' },
    { key: 'growthMindset', displayName: 'Growth Mindset', description: 'Continuous improvement' },
    { key: 'interpersonalAgility', displayName: 'Interpersonal Agility', description: 'Social adaptability' },
  ],
  AI_READINESS_SKILLS: [
    { key: 'aiLiteracy', displayName: 'AI Literacy & Prompt Engineering', description: 'AI understanding' },
    { key: 'changeAdaptability', displayName: 'Change Adaptability', description: 'Adapting to change' },
    { key: 'collaboration', displayName: 'Collaboration & Communication', description: 'Team collaboration' },
    { key: 'dataFluency', displayName: 'Data Fluency', description: 'Data handling' },
    { key: 'responsibleAI', displayName: 'Responsible AI & Ethical Awareness', description: 'AI ethics' },
    { key: 'technicalFundamentals', displayName: 'Technical Fundamentals', description: 'Tech basics' },
    { key: 'criticalThinking', displayName: 'Critical Thinking & Problem-Solving', description: 'Problem solving' },
    { key: 'adaptiveLearning', displayName: 'Adaptability & Continuous Learning', description: 'Learning agility' },
    { key: 'creativeInnovation', displayName: 'Creativity & Innovation', description: 'Creative thinking' },
  ],
  ROLE_DEFINITIONS: {
    'software-engineer': { name: 'Software Engineer', description: 'Builds software', weights: {} },
  },
  normalizeAIReadinessScores: vi.fn((scores: Record<string, number>) => scores),
  getAIReadinessScore: vi.fn((_scores: Record<string, number>, _name: string) => 75),
}));

vi.mock('@/data/aiq-questions', () => ({
  getAIQBandInterpretation: vi.fn().mockReturnValue({
    band: 'Proficient',
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
    { range: '81-100', title: 'Highly Developed', description: 'Exemplary ethical awareness' },
    { range: '61-80', title: 'Proficient', description: 'Strong ethical judgment' },
    { range: '41-60', title: 'Developing', description: 'Growing awareness' },
    { range: '21-40', title: 'Emerging', description: 'Early development' },
    { range: '0-20', title: 'Foundational', description: 'Beginning stage' },
  ],
}));

import {
  exportComparisonPDF,
  exportRoleFitPDF,
  exportIndividualReportPDF,
  exportCandidatePDF,
  exportMultiCandidateComparisonPDF,
  generateIndividualReportPDF,
} from '@/lib/pdfExport';

function resetMocks() {
  Object.values(mockPdfInstance).forEach((val) => {
    if (typeof val === 'function' && 'mockClear' in val) {
      (val as any).mockClear();
    }
  });
  mockPdfInstance.getNumberOfPages.mockReturnValue(3);
  mockPdfInstance.output.mockReturnValue(new Blob(['pdf-content'], { type: 'application/pdf' }));
  mockPdfInstance.splitTextToSize.mockImplementation((text: string) => [text]);
  mockPdfInstance.internal.pageSize.getWidth.mockReturnValue(210);
  mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(297);
  mockPdfInstance.getTextWidth.mockReturnValue(20);
  mockPdfInstance.getStringUnitWidth.mockReturnValue(5);
}

const makeCandidate = (overrides = {}) => ({
  user: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    createdAt: '2025-01-01',
  },
  results: [
    { assessmentType: 'fit', status: 'completed' },
    { assessmentType: 'ai_readiness', status: 'completed' },
  ],
  ...overrides,
});

const makeComparisonData = (overrides = {}) => ({
  candidates: [makeCandidate(), makeCandidate({ user: { firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' } })],
  fitAssessments: [
    { scores: { 'High Agency': 80, 'Resilience': 70 }, completedAt: new Date() },
    { scores: { 'High Agency': 75, 'Resilience': 85 }, completedAt: new Date() },
  ],
  aiReadinessAssessments: [
    { scores: { 'AI Literacy': 90, 'Data Fluency': 70 }, completedAt: new Date() },
    { scores: { 'AI Literacy': 65, 'Data Fluency': 80 }, completedAt: new Date() },
  ],
  promptArchitectureAssessments: [null, null],
  aiqAssessments: [null, null],
  skillComparison: [
    { skillName: 'High Agency', scores: [80, 75] },
    { skillName: 'Resilience', scores: [70, 85] },
  ],
  averageScores: [75, 80],
  ...overrides,
});

const makeRoleFitData = (overrides = {}) => ({
  candidate: makeCandidate(),
  role: { name: 'Software Engineer', description: 'Develops software systems' },
  alignment: {
    overallFit: 78,
    fitSkillAlignments: [
      { skillName: 'High Agency', candidateScore: 80, requiredScore: 70, gap: 10, alignment: 'Exceeds', criticality: 'critical' as const, dataAvailable: true },
      { skillName: 'Resilience', candidateScore: 60, requiredScore: 75, gap: -15, alignment: 'Below', criticality: 'standard' as const, dataAvailable: true },
    ],
    aiReadinessSkillAlignments: [
      { skillName: 'AI Literacy', candidateScore: 85, requiredScore: 70, gap: 15, alignment: 'Exceeds', criticality: 'critical' as const, dataAvailable: true },
    ],
    strengths: ['High Agency', 'AI Literacy'],
    gaps: ['Resilience'],
    finalRecommendation: 'Strong candidate with minor gaps.',
    nextSteps: ['Interview for role-specific scenarios'],
  },
  ...overrides,
});

const makeIndividualReportData = (overrides = {}) => ({
  candidate: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  },
  fitAssessment: {
    scores: { 'High Agency': 80, 'Resilience': 70, 'Growth Mindset': 85 },
    completedAt: '2025-01-01',
  },
  aiReadinessAssessment: {
    scores: { 'AI Literacy': 90, 'Data Fluency': 75 },
    completedAt: '2025-01-02',
  },
  promptArchitectureAssessment: {
    levels: [
      { level: 1, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 }, totalScore: 74, feedback: 'Good start', isImported: false, isMissing: false },
      { level: 2, scores: { clarity: 85, structure: 80, contextRelevance: 75, creativity: 80, iterativeImprovement: 70 }, totalScore: 78, feedback: 'Improving', isImported: false, isMissing: false },
    ],
    totalScore: 76,
    percentile: 65,
    completedAt: '2025-01-03',
  },
  aiqAssessment: { totalScore: 72, scores: { ethics: 75, fairness: 70 }, completedAt: '2025-01-04' },
  aiInsights: 'Strong technical candidate with excellent AI literacy.',
  ...overrides,
});

const makeMultiCandidateData = (overrides = {}) => ({
  roleSnapshot: {
    roleName: 'Software Engineer',
    roleDescription: 'Builds software',
    requiredSkillScores: { 'High Agency': 70, 'Resilience': 65 },
  },
  candidateEntries: [
    {
      userId: '1',
      userName: 'John Doe',
      email: 'john@example.com',
      overallFit: 82,
      fitTier: 'Strong' as const,
      skillScores: [
        { skillName: 'High Agency', score: 85, requiredScore: 70, gap: 15, alignment: 'Exceeds', criticality: 'critical' as const, category: 'fit' as const },
      ],
      strengths: ['Leadership'],
      gaps: [],
      riskFlags: [],
    },
    {
      userId: '2',
      userName: 'Jane Smith',
      email: 'jane@example.com',
      overallFit: 65,
      fitTier: 'Moderate' as const,
      skillScores: [
        { skillName: 'High Agency', score: 60, requiredScore: 70, gap: -10, alignment: 'Below', criticality: 'critical' as const, category: 'fit' as const },
      ],
      strengths: ['Collaboration'],
      gaps: ['Leadership'],
      riskFlags: ['Below critical threshold for High Agency'],
    },
  ],
  summaryInsights: {
    topPerformer: { userId: '1', userName: 'John Doe', overallFit: 82 },
    averageFit: 73.5,
    fitDistribution: { strong: 1, moderate: 1, developmentNeeded: 0 },
    commonStrengths: ['Technical skills'],
    commonGaps: ['Communication'],
    keyDifferentiators: ['Leadership ability'],
  },
  ...overrides,
});

const makeLegacyIndividualData = (overrides = {}) => ({
  candidate: {
    user: {
      id: '1',
      email: 'john@example.com',
      firstName: 'John',
      lastName: 'Doe',
    },
  },
  candidateName: 'John Doe',
  fitData: { scores: { 'High Agency': 80, 'Resilience': 70 } },
  aiData: { scores: { 'AI Literacy': 90, 'Data Fluency': 75 } },
  promptData: {
    totalScore: 76,
    percentile: 65,
    levels: [
      { level: 1, totalScore: 74, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 } },
    ],
  },
  aiqData: { totalScore: 72 },
  profileInsights: 'Strong candidate overall.',
  ...overrides,
});

describe('pdfExport', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('exportComparisonPDF', () => {
    it('should create a PDF without errors with valid data', async () => {
      await exportComparisonPDF(makeComparisonData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });

    it('should return early when no candidates provided', async () => {
      await exportComparisonPDF(makeComparisonData({ candidates: [] }));
      expect(mockPdfInstance.addPage).not.toHaveBeenCalled();
    });

    it('should handle single candidate comparison', async () => {
      await exportComparisonPDF(makeComparisonData({
        candidates: [makeCandidate()],
        fitAssessments: [{ scores: { 'High Agency': 80 }, completedAt: new Date() }],
        aiReadinessAssessments: [{ scores: { 'AI Literacy': 90 }, completedAt: new Date() }],
        promptArchitectureAssessments: [null],
        aiqAssessments: [null],
        skillComparison: [{ skillName: 'High Agency', scores: [80] }],
        averageScores: [80],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates without names', async () => {
      const data = makeComparisonData({
        candidates: [
          { user: { email: 'nofirst@example.com' }, results: [] },
          { user: { email: 'nosecond@example.com' }, results: [] },
        ],
      });
      await exportComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null fit assessments', async () => {
      await exportComparisonPDF(makeComparisonData({
        fitAssessments: [null, null],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null AI readiness assessments', async () => {
      await exportComparisonPDF(makeComparisonData({
        aiReadinessAssessments: [null, null],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle chart images when provided', async () => {
      await exportComparisonPDF(makeComparisonData({
        fitChartImages: ['data:image/png;base64,chart1', 'data:image/png;base64,chart2'],
        aiChartImages: ['data:image/png;base64,aichart1', null],
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle combined chart images', async () => {
      await exportComparisonPDF(makeComparisonData({
        fitCombinedChartImage: 'data:image/png;base64,combined',
        aiCombinedChartImage: 'data:image/png;base64,combined2',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle overall skills chart image', async () => {
      await exportComparisonPDF(makeComparisonData({
        overallSkillsChartImage: 'data:image/png;base64,overall',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle selected role', async () => {
      await exportComparisonPDF(makeComparisonData({
        selectedRole: 'software-engineer',
        roleData: { id: 'sw-eng', name: 'Software Engineer', description: 'Dev role' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle assessment weights', async () => {
      await exportComparisonPDF(makeComparisonData({
        assessmentWeights: { fit: 30, aiReadiness: 30, promptArchitecture: 20, aiq: 20 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle employer recommendation', async () => {
      await exportComparisonPDF(makeComparisonData({
        employerRecommendation: 'Candidate A is recommended for the role.',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle comparison next steps', async () => {
      await exportComparisonPDF(makeComparisonData({
        comparisonNextSteps: ['Schedule interviews', 'Review references'],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should set page numbers for all pages', async () => {
      await exportComparisonPDF(makeComparisonData());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
    });

    it('should handle prompt architecture assessments', async () => {
      await exportComparisonPDF(makeComparisonData({
        promptArchitectureAssessments: [
          {
            levels: [{ level: 1, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 }, totalScore: 74, feedback: 'Good' }],
            totalScore: 74,
            percentile: 60,
            completedAt: new Date(),
          },
          null,
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AIQ assessments', async () => {
      await exportComparisonPDF(makeComparisonData({
        aiqAssessments: [
          { totalScore: 85, scores: { ethics: 90 }, completedAt: new Date() },
          { totalScore: 60, scores: { ethics: 55 }, completedAt: new Date() },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle three candidates', async () => {
      await exportComparisonPDF(makeComparisonData({
        candidates: [makeCandidate(), makeCandidate({ user: { firstName: 'Jane', lastName: 'S', email: 'j@e.com' } }), makeCandidate({ user: { firstName: 'Bob', lastName: 'B', email: 'b@e.com' } })],
        fitAssessments: [
          { scores: { 'High Agency': 80 }, completedAt: new Date() },
          { scores: { 'High Agency': 75 }, completedAt: new Date() },
          { scores: { 'High Agency': 60 }, completedAt: new Date() },
        ],
        aiReadinessAssessments: [null, null, null],
        promptArchitectureAssessments: [null, null, null],
        aiqAssessments: [null, null, null],
        skillComparison: [{ skillName: 'High Agency', scores: [80, 75, 60] }],
        averageScores: [80, 75, 60],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skill comparison with null scores', async () => {
      await exportComparisonPDF(makeComparisonData({
        skillComparison: [
          { skillName: 'High Agency', scores: [80, null] },
          { skillName: 'Resilience', scores: [null, 70] },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportRoleFitPDF', () => {
    it('should create a PDF without errors', async () => {
      await exportRoleFitPDF(makeRoleFitData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });

    it('should handle candidate without name', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        candidate: { user: { email: 'anon@example.com' }, results: [] },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null overall fit', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: null },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null skill alignments', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          fitSkillAlignments: null,
          aiReadinessSkillAlignments: null,
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty strengths and gaps', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          strengths: [],
          gaps: [],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle object-type strengths', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          strengths: [{ skill: 'High Agency', summary: 'Excellent', description: 'Very proactive' }],
          gaps: [{ skill: 'Resilience', summary: 'Needs work', description: 'Could improve' }],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle cohort benchmarks', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          cohortBenchmarks: {
            overall: { percentile: 75, totalCandidates: 100, position: 'Above Average' },
            fit: { percentile: 80, totalCandidates: 100, skillCount: 6, avgScore: 72 },
            ai_readiness: { percentile: 70, totalCandidates: 100, skillCount: 9, avgScore: 68 },
          },
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle interview questions', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          interviewQuestions: [
            { question: 'Describe a challenge', purpose: 'Assess resilience', targetSkill: 'Resilience' },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role flexibility', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          roleFlexibility: [
            { roleId: 'pm', roleName: 'Project Manager', fitScore: 70, coveragePercent: 80, coverageLabel: 'High' as const },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle next steps', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          nextSteps: ['Schedule panel interview', 'Review portfolio'],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle critical skill names', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        criticalSkillNames: ['High Agency', 'AI Literacy'],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt role fit analysis', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          promptRoleFitAnalysis: 'Candidate shows strong prompt engineering skills relevant to the role.',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AIQ role fit analysis', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          aiqRoleFitAnalysis: 'Ethical awareness aligns well with role requirements.',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle high fit score (>= 80)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 92 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low fit score (< 40)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 25 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with dataAvailable false', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          fitSkillAlignments: [
            { skillName: 'High Agency', candidateScore: null, requiredScore: 70, gap: null, alignment: 'N/A', criticality: 'critical' as const, dataAvailable: false },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportIndividualReportPDF', () => {
    it('should create a PDF without errors', async () => {
      await exportIndividualReportPDF(makeIndividualReportData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with email-only name', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        candidate: { email: 'user@example.com' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null FIT assessment', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        fitAssessment: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null AI readiness assessment', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiReadinessAssessment: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null prompt architecture assessment', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        promptArchitectureAssessment: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null AIQ assessment', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiqAssessment: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all null assessments', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        fitAssessment: null,
        aiReadinessAssessment: null,
        promptArchitectureAssessment: null,
        aiqAssessment: null,
        aiInsights: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle FIT chart image', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        fitChartImage: 'data:image/png;base64,fitchart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle AI chart image', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiChartImage: 'data:image/png;base64,aichart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle null AI insights', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiInsights: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle high AIQ score', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiqAssessment: { totalScore: 95, completedAt: '2025-01-04' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low AIQ score', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiqAssessment: { totalScore: 15, completedAt: '2025-01-04' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt levels with missing flags', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        promptArchitectureAssessment: {
          levels: [
            { level: 1, scores: { clarity: 0, structure: 0, contextRelevance: 0, creativity: 0, iterativeImprovement: 0 }, totalScore: 0, feedback: 'Missing', isImported: false, isMissing: true },
          ],
          totalScore: 0,
          completedAt: '2025-01-03',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportCandidatePDF', () => {
    it('should create a basic candidate PDF', async () => {
      const skills = [
        { name: 'High Agency', score: 80, assessment: 'fit' },
        { name: 'AI Literacy', score: 90, assessment: 'ai_readiness' },
      ];
      await exportCandidatePDF(makeCandidate(), skills);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate without name', async () => {
      await exportCandidatePDF(
        { user: { email: 'anon@test.com' }, results: [] },
        [{ name: 'Skill A', score: 70, assessment: 'fit' }]
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty skills array', async () => {
      await exportCandidatePDF(makeCandidate(), []);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle many skills requiring page breaks', async () => {
      const manySkills = Array.from({ length: 30 }, (_, i) => ({
        name: `Skill ${i + 1}`,
        score: Math.round(40 + Math.random() * 60),
        assessment: i < 15 ? 'fit' : 'ai_readiness',
      }));
      await exportCandidatePDF(makeCandidate(), manySkills);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with no completed results', async () => {
      await exportCandidatePDF(
        makeCandidate({ results: [] }),
        [{ name: 'Skill A', score: 50, assessment: 'fit' }]
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle zero scores', async () => {
      await exportCandidatePDF(makeCandidate(), [
        { name: 'Low Skill', score: 0, assessment: 'fit' },
      ]);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle perfect scores', async () => {
      await exportCandidatePDF(makeCandidate(), [
        { name: 'Perfect Skill', score: 100, assessment: 'fit' },
      ]);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportMultiCandidateComparisonPDF', () => {
    it('should create a PDF without errors', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should return early when no candidate entries', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({ candidateEntries: [] }));
      expect(mockPdfInstance.addPage).not.toHaveBeenCalled();
    });

    it('should handle single candidate', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries = [data.candidateEntries[0]];
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle bar chart image', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        barChartImage: 'data:image/png;base64,barchart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle prompt architecture analysis', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        promptArchitectureAnalysis: 'Candidates show varying prompt skills.',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AIQ analysis', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        aiqAnalysis: 'Most candidates show strong ethical awareness.',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle critical skill names', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        criticalSkillNames: ['High Agency', 'Resilience'],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AI insights', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        aiInsights: 'Overall strong cohort with complementary skills.',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle recommendation data', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        recommendation: {
          recommendedCandidate: 'John Doe',
          fitScore: 82,
          fitTier: 'Strong',
          reasons: ['Highest overall fit', 'Exceeds critical skills'],
          criticalSkillAdvantages: ['High Agency exceeds by 15%'],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with data coverage info', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries[0].dataCoverage = {
        percentage: 85,
        assessedSkillCount: 12,
        totalRequiredSkills: 15,
        missingAssessments: ['aiq'],
      };
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle advanced analytics in summary insights', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        summaryInsights: {
          ...makeMultiCandidateData().summaryInsights,
          skillDominance: [{ candidateName: 'John Doe', winsCount: 8, totalSkills: 10 }],
          consistencyScores: [{ candidateName: 'John Doe', consistencyScore: 92, interpretation: 'Very consistent' }],
          criticalGapRatios: [{ candidateName: 'Jane Smith', criticalGaps: 2, totalCritical: 5, riskLevel: 'Moderate' }],
          largestDifferential: { skillName: 'High Agency', topCandidate: 'John', topScore: 85, bottomCandidate: 'Jane', bottomScore: 60, spread: 25 },
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateIndividualReportPDF', () => {
    it('should create a PDF without errors', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null FIT data', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({ fitData: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null AI data', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({ aiData: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null prompt data', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({ promptData: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null AIQ data', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({ aiqData: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all null assessment data', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: null,
        aiData: null,
        promptData: null,
        aiqData: null,
        profileInsights: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle FIT chart image', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitChartImage: 'data:image/png;base64,fitchart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle AI chart image', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        aiChartImage: 'data:image/png;base64,aichart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle null profile insights', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        profileInsights: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate without firstName', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        candidate: { user: { id: '1', email: 'test@test.com' } },
        candidateName: 'test',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle high-scoring candidate', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: { scores: { 'High Agency': 95, 'Resilience': 92 } },
        aiData: { scores: { 'AI Literacy': 98, 'Data Fluency': 90 } },
        promptData: { totalScore: 92, percentile: 95 },
        aiqData: { totalScore: 88 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low-scoring candidate', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: { scores: { 'High Agency': 20, 'Resilience': 15 } },
        aiData: { scores: { 'AI Literacy': 10, 'Data Fluency': 25 } },
        promptData: { totalScore: 18, percentile: 5 },
        aiqData: { totalScore: 12 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt data without levels', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        promptData: { totalScore: 70 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt data without percentile', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        promptData: { totalScore: 70, levels: [] },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt data with multiple levels and scores', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        promptData: {
          totalScore: 82,
          percentile: 78,
          levels: [
            { level: 1, totalScore: 74, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 } },
            { level: 2, totalScore: 78, scores: { clarity: 85, structure: 80, contextRelevance: 75, creativity: 80, iterativeImprovement: 70 } },
            { level: 3, totalScore: 85, scores: { clarity: 90, structure: 85, contextRelevance: 80, creativity: 88, iterativeImprovement: 82 } },
            { level: 4, totalScore: 91, scores: { clarity: 95, structure: 90, contextRelevance: 88, creativity: 92, iterativeImprovement: 90 } },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only first name', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        candidate: { user: { id: '1', email: 'test@test.com', firstName: 'Alice' } },
        candidateName: 'Alice',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only last name', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        candidate: { user: { id: '1', email: 'test@test.com', lastName: 'Johnson' } },
        candidateName: 'Johnson',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle medium-scoring candidate (60-79 range)', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: { scores: { 'High Agency': 65, 'Resilience': 72 } },
        aiData: { scores: { 'AI Literacy': 68, 'Data Fluency': 63 } },
        promptData: { totalScore: 65, percentile: 50 },
        aiqData: { totalScore: 70 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle only FIT data with all other assessments null', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: { scores: { 'High Agency': 80, 'Resilience': 70 } },
        aiData: null,
        promptData: null,
        aiqData: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle only AI data with all other assessments null', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitData: null,
        aiData: { scores: { 'AI Literacy': 85, 'Data Fluency': 78 } },
        promptData: null,
        aiqData: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle both chart images', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData({
        fitChartImage: 'data:image/png;base64,fitchart',
        aiChartImage: 'data:image/png;base64,aichart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle very long profile insights text', async () => {
      const longInsights = 'This is a very long profile insights text that spans multiple lines and paragraphs. '.repeat(20);
      await generateIndividualReportPDF(makeLegacyIndividualData({
        profileInsights: longInsights,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportComparisonPDF - additional edge cases', () => {
    it('should handle undefined candidates', async () => {
      await exportComparisonPDF({ candidates: undefined as any } as any);
      expect(mockPdfInstance.addPage).not.toHaveBeenCalled();
    });

    it('should handle candidates with only first name', async () => {
      await exportComparisonPDF(makeComparisonData({
        candidates: [
          { user: { firstName: 'Alice', email: 'alice@test.com' }, results: [] },
          { user: { firstName: 'Bob', email: 'bob@test.com' }, results: [] },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with only last name', async () => {
      await exportComparisonPDF(makeComparisonData({
        candidates: [
          { user: { lastName: 'Smith', email: 'smith@test.com' }, results: [] },
          { user: { lastName: 'Jones', email: 'jones@test.com' }, results: [] },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle both prompt and AIQ assessments together', async () => {
      await exportComparisonPDF(makeComparisonData({
        promptArchitectureAssessments: [
          { levels: [{ level: 1, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 }, totalScore: 74, feedback: 'Good' }], totalScore: 74, percentile: 60, completedAt: new Date() },
          { levels: [{ level: 1, scores: { clarity: 70, structure: 65, contextRelevance: 60, creativity: 75, iterativeImprovement: 55 }, totalScore: 65, feedback: 'OK' }], totalScore: 65, percentile: 45, completedAt: new Date() },
        ],
        aiqAssessments: [
          { totalScore: 85, scores: { ethics: 90 }, completedAt: new Date() },
          { totalScore: 60, scores: { ethics: 55 }, completedAt: new Date() },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle role data without description', async () => {
      await exportComparisonPDF(makeComparisonData({
        selectedRole: 'custom-role',
        roleData: { id: 'cr', name: 'Custom Role' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty skill comparison array', async () => {
      await exportComparisonPDF(makeComparisonData({
        skillComparison: [],
        averageScores: [0, 0],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle selectedRole without roleData', async () => {
      await exportComparisonPDF(makeComparisonData({
        selectedRole: 'software-engineer',
        roleData: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should set correct page dimensions', async () => {
      await exportComparisonPDF(makeComparisonData());
      expect(mockPdfInstance.internal.pageSize.getWidth).toHaveBeenCalled();
      expect(mockPdfInstance.internal.pageSize.getHeight).toHaveBeenCalled();
    });

    it('should call savePdfMobile to save the PDF', async () => {
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      await exportComparisonPDF(makeComparisonData());
      expect(savePdfMobile).toHaveBeenCalled();
    });
  });

  describe('exportRoleFitPDF - additional edge cases', () => {
    it('should handle all skill alignments with data unavailable', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          fitSkillAlignments: [
            { skillName: 'High Agency', candidateScore: null, requiredScore: 70, gap: null, alignment: 'N/A', criticality: 'critical' as const, dataAvailable: false },
            { skillName: 'Resilience', candidateScore: null, requiredScore: 65, gap: null, alignment: 'N/A', criticality: 'standard' as const, dataAvailable: false },
          ],
          aiReadinessSkillAlignments: [
            { skillName: 'AI Literacy', candidateScore: null, requiredScore: 70, gap: null, alignment: 'N/A', criticality: 'critical' as const, dataAvailable: false },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle medium fit score (55-69 range)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 62 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle fit score at boundary (40)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 40 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle fit score at boundary (55)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 55 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle fit score at boundary (70)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 70 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle fit score at boundary (85)', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: { ...makeRoleFitData().alignment, overallFit: 85 },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty role flexibility', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          roleFlexibility: [],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle multiple role flexibility entries', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          roleFlexibility: [
            { roleId: 'pm', roleName: 'Project Manager', fitScore: 70, coveragePercent: 80, coverageLabel: 'High' as const },
            { roleId: 'da', roleName: 'Data Analyst', fitScore: 55, coveragePercent: 60, coverageLabel: 'Medium' as const },
            { roleId: 'qa', roleName: 'QA Engineer', fitScore: 40, coveragePercent: 45, coverageLabel: 'Limited' as const },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty interview questions', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          interviewQuestions: [],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle multiple interview questions', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          interviewQuestions: [
            { question: 'Describe a challenge', purpose: 'Assess resilience', targetSkill: 'Resilience' },
            { question: 'How do you learn new tech?', purpose: 'Assess curiosity', targetSkill: 'Intellectual Curiosity' },
            { question: 'Ethical dilemma scenario', purpose: 'Assess ethics', targetSkill: 'Empathy & Ethics' },
          ],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle cohort benchmarks with prompt and aiq', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          cohortBenchmarks: {
            overall: { percentile: 75, totalCandidates: 100, position: 'Above Average' },
            fit: { percentile: 80, totalCandidates: 100, skillCount: 6, avgScore: 72 },
            ai_readiness: { percentile: 70, totalCandidates: 100, skillCount: 9, avgScore: 68 },
            prompt_architecture: { percentile: 65, totalCandidates: 80, avgScore: 70 },
            aiq: { percentile: 55, totalCandidates: 90, avgScore: 62 },
          },
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle both prompt and AIQ role fit analyses', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          promptRoleFitAnalysis: 'Strong prompt skills for the role.',
          aiqRoleFitAnalysis: 'Good ethical alignment with role needs.',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty next steps', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        alignment: {
          ...makeRoleFitData().alignment,
          nextSteps: [],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with first and last name', async () => {
      await exportRoleFitPDF(makeRoleFitData({
        candidate: makeCandidate({ user: { firstName: 'Alice', lastName: 'Wonderland', email: 'alice@test.com' } }),
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportIndividualReportPDF - additional edge cases', () => {
    it('should handle candidate with first name only', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        candidate: { firstName: 'Alice', email: 'alice@test.com' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with last name only', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        candidate: { lastName: 'Smith', email: 'smith@test.com' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt assessment with imported levels', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        promptArchitectureAssessment: {
          levels: [
            { level: 1, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 }, totalScore: 74, feedback: 'Good start', isImported: true, isMissing: false },
          ],
          totalScore: 74,
          completedAt: '2025-01-03',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle both chart images together', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        fitChartImage: 'data:image/png;base64,fitchart',
        aiChartImage: 'data:image/png;base64,aichart',
      }));
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should handle FIT assessment with many skills', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        fitAssessment: {
          scores: {
            'High Agency': 80, 'Resilience': 70, 'Growth Mindset': 85,
            'Intellectual Curiosity': 90, 'Empathy & Ethics': 75, 'Interpersonal Agility': 65,
          },
          completedAt: '2025-01-01',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AI readiness assessment with many skills', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiReadinessAssessment: {
          scores: {
            'AI Literacy': 90, 'Data Fluency': 75, 'Change Adaptability': 80,
            'Collaboration': 85, 'Responsible AI': 70, 'Technical Fundamentals': 65,
            'Critical Thinking': 88, 'Adaptive Learning': 72, 'Creative Innovation': 78,
          },
          completedAt: '2025-01-02',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle prompt assessment with 4 levels', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        promptArchitectureAssessment: {
          levels: [
            { level: 1, scores: { clarity: 80, structure: 75, contextRelevance: 70, creativity: 85, iterativeImprovement: 60 }, totalScore: 74, feedback: 'Level 1', isImported: false, isMissing: false },
            { level: 2, scores: { clarity: 85, structure: 80, contextRelevance: 75, creativity: 80, iterativeImprovement: 70 }, totalScore: 78, feedback: 'Level 2', isImported: false, isMissing: false },
            { level: 3, scores: { clarity: 90, structure: 85, contextRelevance: 80, creativity: 88, iterativeImprovement: 82 }, totalScore: 85, feedback: 'Level 3', isImported: false, isMissing: false },
            { level: 4, scores: { clarity: 95, structure: 90, contextRelevance: 88, creativity: 92, iterativeImprovement: 90 }, totalScore: 91, feedback: 'Level 4', isImported: false, isMissing: false },
          ],
          totalScore: 82,
          percentile: 78,
          completedAt: '2025-01-03',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle very long AI insights text', async () => {
      const longInsights = 'Candidate demonstrates strong analytical skills and a thorough understanding of AI concepts. '.repeat(15);
      await exportIndividualReportPDF(makeIndividualReportData({
        aiInsights: longInsights,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle AIQ assessment without scores field', async () => {
      await exportIndividualReportPDF(makeIndividualReportData({
        aiqAssessment: { totalScore: 72, completedAt: '2025-01-04' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportCandidatePDF - additional edge cases', () => {
    it('should handle candidate with only first name', async () => {
      await exportCandidatePDF(
        { user: { firstName: 'Alice', email: 'alice@test.com' }, results: [] },
        [{ name: 'Skill A', score: 70, assessment: 'fit' }]
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidate with only last name', async () => {
      await exportCandidatePDF(
        { user: { lastName: 'Smith', email: 'smith@test.com' }, results: [] },
        [{ name: 'Skill A', score: 70, assessment: 'fit' }]
      );
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with very long names', async () => {
      await exportCandidatePDF(makeCandidate(), [
        { name: 'This is a very long skill name that exceeds forty characters easily', score: 75, assessment: 'fit' },
      ]);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle skills with very long assessment names', async () => {
      await exportCandidatePDF(makeCandidate(), [
        { name: 'Skill A', score: 75, assessment: 'a_very_long_assessment_type_name_here' },
      ]);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle mixed score ranges', async () => {
      await exportCandidatePDF(makeCandidate(), [
        { name: 'Excellent', score: 95, assessment: 'fit' },
        { name: 'Good', score: 75, assessment: 'fit' },
        { name: 'Fair', score: 55, assessment: 'ai_readiness' },
        { name: 'Developing', score: 35, assessment: 'ai_readiness' },
        { name: 'Low', score: 10, assessment: 'fit' },
      ]);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('exportMultiCandidateComparisonPDF - additional edge cases', () => {
    it('should handle undefined candidateEntries', async () => {
      await exportMultiCandidateComparisonPDF({ candidateEntries: undefined as any } as any);
      expect(mockPdfInstance.addPage).not.toHaveBeenCalled();
    });

    it('should handle many candidates', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        userId: String(i + 1),
        userName: `Candidate ${i + 1}`,
        email: `c${i + 1}@test.com`,
        overallFit: 50 + i * 5,
        rank: i + 1,
        fitTier: (i > 6 ? 'strong' : i > 3 ? 'moderate' : 'development-needed') as any,
        skillScores: [
          { skillName: 'High Agency', score: 50 + i * 4, requiredScore: 70, gap: i * 4 - 20, alignment: 'Close', criticality: 'critical' as const, category: 'fit' as const },
        ],
        strengths: [`Strength ${i}`],
        gaps: [`Gap ${i}`],
        riskFlags: [],
      }));
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({ candidateEntries: entries }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with null overallFit', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries[0].overallFit = null;
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with insufficient-data tier', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries[1].fitTier = 'insufficient-data' as any;
      data.candidateEntries[1].overallFit = null;
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with object-type strengths and gaps', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries[0].strengths = [{ skill: 'High Agency', summary: 'Excellent', description: 'Very proactive' }];
      data.candidateEntries[0].gaps = [{ skill: 'Resilience', summary: 'Needs work', description: 'Could improve' }];
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null recommendation', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        recommendation: null,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty common strengths and gaps', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        summaryInsights: {
          ...makeMultiCandidateData().summaryInsights,
          commonStrengths: [],
          commonGaps: [],
          keyDifferentiators: [],
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all candidates in development-needed tier', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        candidateEntries: [
          { ...makeMultiCandidateData().candidateEntries[0], overallFit: 35, fitTier: 'development-needed' as any },
          { ...makeMultiCandidateData().candidateEntries[1], overallFit: 28, fitTier: 'development-needed' as any },
        ],
        summaryInsights: {
          ...makeMultiCandidateData().summaryInsights,
          fitDistribution: { strong: 0, moderate: 0, developmentNeeded: 2 },
          averageFit: 31.5,
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null criticalSkillNames', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        criticalSkillNames: undefined,
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle both promptArchitectureAnalysis and aiqAnalysis', async () => {
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData({
        promptArchitectureAnalysis: 'Prompt analysis text here.',
        aiqAnalysis: 'AIQ analysis text here.',
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle candidates with multiple skill scores', async () => {
      const data = makeMultiCandidateData();
      data.candidateEntries[0].skillScores = [
        { skillName: 'High Agency', score: 85, requiredScore: 70, gap: 15, alignment: 'Exceeds', criticality: 'critical' as const, category: 'fit' as const },
        { skillName: 'Resilience', score: 60, requiredScore: 75, gap: -15, alignment: 'Below', criticality: 'standard' as const, category: 'fit' as const },
        { skillName: 'AI Literacy', score: 90, requiredScore: 80, gap: 10, alignment: 'Exceeds', criticality: 'critical' as const, category: 'ai_readiness' as const },
      ];
      await exportMultiCandidateComparisonPDF(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('PDF generation integration checks', () => {
    it('should use jsPDF constructor for comparison PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await exportComparisonPDF(makeComparisonData());
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should use jsPDF constructor for role fit PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await exportRoleFitPDF(makeRoleFitData());
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should use jsPDF constructor for individual report PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await exportIndividualReportPDF(makeIndividualReportData());
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should use jsPDF constructor for candidate PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await exportCandidatePDF(makeCandidate(), [{ name: 'S', score: 50, assessment: 'fit' }]);
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should use jsPDF constructor for multi-candidate PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await exportMultiCandidateComparisonPDF(makeMultiCandidateData());
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should use jsPDF constructor for legacy individual PDF', async () => {
      const jsPDF = (await import('jspdf')).default;
      await generateIndividualReportPDF(makeLegacyIndividualData());
      expect(jsPDF).toHaveBeenCalledWith('p', 'mm', 'a4');
    });

    it('should add logo image in header for comparison PDF', async () => {
      await exportComparisonPDF(makeComparisonData());
      expect(mockPdfInstance.addImage).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64'),
        'PNG',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should call setPage for footer pagination in comparison PDF', async () => {
      await exportComparisonPDF(makeComparisonData());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
      expect(mockPdfInstance.getNumberOfPages).toHaveBeenCalled();
    });

    it('should call setPage for footer pagination in role fit PDF', async () => {
      await exportRoleFitPDF(makeRoleFitData());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
      expect(mockPdfInstance.getNumberOfPages).toHaveBeenCalled();
    });

    it('should call setPage for footer pagination in legacy PDF', async () => {
      await generateIndividualReportPDF(makeLegacyIndividualData());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
      expect(mockPdfInstance.getNumberOfPages).toHaveBeenCalled();
    });
  });
});
