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
  output: vi.fn().mockReturnValue(new Blob(['pdf-content'])),
  save: vi.fn(),
  circle: vi.fn(),
  roundedRect: vi.fn(),
  getTextWidth: vi.fn().mockReturnValue(20),
  getStringUnitWidth: vi.fn().mockReturnValue(5),
  splitTextToSize: vi.fn((text: string) => [text]),
  getNumberOfPages: vi.fn().mockReturnValue(5),
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

import { generateEcosystemPdf } from '@/lib/ecosystemPdfExport';

function resetMocks() {
  Object.values(mockPdfInstance).forEach((val) => {
    if (typeof val === 'function' && 'mockClear' in val) {
      (val as any).mockClear();
    }
  });
  mockPdfInstance.getNumberOfPages.mockReturnValue(5);
  mockPdfInstance.splitTextToSize.mockImplementation((text: string) => [text]);
  mockPdfInstance.internal.pageSize.getWidth.mockReturnValue(210);
  mockPdfInstance.internal.pageSize.getHeight.mockReturnValue(297);
  mockPdfInstance.getTextWidth.mockReturnValue(20);
  mockPdfInstance.getStringUnitWidth.mockReturnValue(5);
}

const makeEcosystemData = (overrides: any = {}) => ({
  companyName: 'TestCorp',
  project: {
    missionStatement: 'Build innovative AI solutions',
    teamStage: 'growth_stage',
    currentChallenges: 'Scaling the team rapidly',
    hiringPlans: 5,
    delayedTasks: 'Backend refactoring',
    conflictTopics: 'Resource allocation',
    avoidedWork: 'Documentation',
    overloadedMember: 'John (backend)',
    wishedSkills: 'ML engineering',
    idealInteractionStyle: 'Collaborative and open',
    personalityGap: 'Need more strategic thinkers',
    upcomingInitiative: 'Launch AI product',
    cloneableSkills: 'Full-stack development',
    transformativeFix: 'Better onboarding process',
  },
  analysis: {
    missionAlignmentScore: 72,
    overallHealthScore: 68,
    teamSize: 8,
    generatedAt: '2025-01-15T10:00:00Z',
    executiveSummary: 'The team shows strong technical capabilities but has gaps in leadership and communication.\n\nRecommend targeted hiring.',
    capabilityGapMatrix: [
      { code: 'HA', capability: 'High Agency', currentScore: 65, targetScore: 80, teamStrength: 'adequate', missionPriority: 'high', gapAnalysis: 'Team needs more proactive members.' },
      { code: 'IC', capability: 'Intellectual Curiosity', currentScore: 82, targetScore: 75, teamStrength: 'strong', missionPriority: 'medium' },
      { code: 'RA', capability: 'Resilience', currentScore: 45, targetScore: 70, teamStrength: 'weak', missionPriority: 'critical', gapAnalysis: 'Critical gap in team resilience.' },
    ],
    riskAlerts: [
      { title: 'Low Resilience Coverage', severity: 'warning', description: 'Only 2 of 8 team members meet the resilience target.', recommendation: 'Consider resilience training program.' },
      { title: 'Single Point of Failure', severity: 'critical', description: 'John is the only backend developer.', recommendation: 'Hire backup backend developer urgently.' },
    ],
    contextualInsights: [
      { title: 'Team Dynamics', category: 'team_dynamics', analysis: 'Strong collaboration but needs leadership development.' },
      { title: 'Future Needs', category: 'future_needs', analysis: 'AI product launch requires scaling technical capabilities.' },
    ],
    idealCandidateProfile: {
      summary: 'Ideal hire should have strong agency and resilience with AI readiness.',
      fitTargets: {
        HA: { min: 75, ideal: 90, reasoning: 'Innovation requires high initiative.' },
        RA: { min: 70, ideal: 85, reasoning: 'Scaling creates pressure points.' },
      },
    },
    idealHireProfiles: [
      {
        priority: 1,
        roleTitle: 'Senior Backend Developer',
        rationale: 'Reduce dependency on single backend developer.',
        fitTargets: { HA: { min: 75, ideal: 90 }, RA: { min: 70, ideal: 85 } },
        keyBehaviors: ['Problem-solving under pressure', 'Systems thinking'],
        redFlags: ['Avoids ownership', 'Cannot work independently'],
      },
      {
        priority: 2,
        roleTitle: 'ML Engineer',
        rationale: 'Build AI capabilities for product launch.',
        fitTargets: { IC: { min: 80, ideal: 95 } },
        keyBehaviors: ['Research orientation', 'Continuous learning'],
        redFlags: ['Rigid thinking'],
      },
    ],
    hiringRecommendations: [
      {
        priority: 1,
        title: 'Senior Backend Developer',
        description: 'Reduce dependency on single backend developer.',
        targetScores: { HA: 75, RA: 70 },
        keyBehaviors: ['Problem-solving under pressure', 'Systems thinking'],
        redFlags: ['Avoids ownership', 'Cannot work independently'],
      },
    ],
    teamRecommendations: ['Invest in resilience training', 'Cross-train on backend systems'],
    developmentPriorities: [
      { capability: 'Resilience', currentLevel: 'Developing', targetLevel: 'Strong', actions: ['Workshop series', 'Mentoring program'] },
    ],
  },
  missionAnalysis: {
    summary: 'Mission requires strong agency and resilience to drive innovation in a competitive market.',
    capabilityPriorities: [
      { code: 'HA', name: 'High Agency', priority: 'critical', reasoning: 'Innovation requires proactive team members.' },
      { code: 'RA', name: 'Resilience', priority: 'high', reasoning: 'Rapid scaling creates pressure requiring resilience.' },
      { code: 'IC', name: 'Intellectual Curiosity', priority: 'medium', reasoning: 'AI domain demands continuous learning.' },
    ],
  },
  teamMembers: [
    { name: 'John Smith', role: 'Backend Developer', fitScores: { HA: 80, IC: 75, RA: 60 } },
    { name: 'Jane Doe', role: 'Frontend Developer', fitScores: { HA: 70, IC: 85, RA: 72 } },
    { name: 'Bob Wilson', role: 'Designer', fitScores: { HA: 65, IC: 80, RA: 55 } },
  ],
  cumulativeScores: [
    { capability: 'High Agency', code: 'HA', score: 215, maxPossible: 300 },
    { capability: 'Intellectual Curiosity', code: 'IC', score: 240, maxPossible: 300 },
    { capability: 'Resilience', code: 'RA', score: 187, maxPossible: 300 },
  ],
  ...overrides,
});

describe('ecosystemPdfExport', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('generateEcosystemPdf - basic generation', () => {
    it('should create a PDF without errors with full data', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });

    it('should call savePdfMobile with correct filename format', async () => {
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      await generateEcosystemPdf(makeEcosystemData());
      expect(savePdfMobile).toHaveBeenCalledWith(
        mockPdfInstance,
        expect.stringMatching(/^Team-Diagnostic-Report-TestCorp-\d{4}-\d{2}-\d{2}\.pdf$/)
      );
    });

    it('should add the HUMANMETRIX logo', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('should create multiple pages', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.addPage).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - company name', () => {
    it('should handle empty company name', async () => {
      await generateEcosystemPdf(makeEcosystemData({ companyName: '' }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null company name', async () => {
      await generateEcosystemPdf(makeEcosystemData({ companyName: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle company name with spaces for filename', async () => {
      const { savePdfMobile } = await import('@/lib/pdfStyles');
      await generateEcosystemPdf(makeEcosystemData({ companyName: 'Acme Corp Inc' }));
      expect(savePdfMobile).toHaveBeenCalledWith(
        mockPdfInstance,
        expect.stringContaining('Acme-Corp-Inc')
      );
    });

    it('should handle very long company name', async () => {
      await generateEcosystemPdf(makeEcosystemData({ companyName: 'A'.repeat(100) }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - project data', () => {
    it('should handle minimal project data', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        project: { missionStatement: 'Test mission' },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle no deep dive data', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        project: {
          missionStatement: 'Test',
          teamStage: 'early',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all deep dive fields populated', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle project with empty strings for deep dive fields', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        project: {
          missionStatement: 'Test',
          delayedTasks: '',
          conflictTopics: '',
          avoidedWork: '',
          overloadedMember: '',
          wishedSkills: '',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle project with very long mission statement', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        project: {
          missionStatement: 'Our mission is to ' + 'transform the world through innovative AI solutions '.repeat(10),
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle team stage with underscores being replaced', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        project: {
          missionStatement: 'Test',
          teamStage: 'early_growth_phase',
        },
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - team members', () => {
    it('should handle empty team members', async () => {
      await generateEcosystemPdf(makeEcosystemData({ teamMembers: [] }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle team members without FIT scores', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        teamMembers: [
          { name: 'No Scores', role: 'Intern' },
          { name: 'Also No Scores', role: 'New Hire' },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle team members without names', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        teamMembers: [
          { fitScores: { HA: 70 } },
          { name: '', role: '', fitScores: { HA: 65 } },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle large team (20+ members)', async () => {
      const largeTeam = Array.from({ length: 20 }, (_, i) => ({
        name: `Member ${i + 1}`,
        role: `Role ${i + 1}`,
        fitScores: { HA: 60 + i, IC: 55 + i, RA: 50 + i },
      }));
      await generateEcosystemPdf(makeEcosystemData({ teamMembers: largeTeam }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle single team member', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        teamMembers: [{ name: 'Solo Dev', role: 'CTO', fitScores: { HA: 90, IC: 85 } }],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle team member with empty fitScores', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        teamMembers: [{ name: 'Empty', role: 'Test', fitScores: {} }],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - analysis scores', () => {
    it('should handle high mission alignment score (>=70)', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = 95;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle medium mission alignment score (50-69)', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = 55;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low mission alignment score (<50)', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = 25;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle low health score', async () => {
      const data = makeEcosystemData();
      data.analysis.overallHealthScore = 30;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle zero scores', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = 0;
      data.analysis.overallHealthScore = 0;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle 100% scores', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = 100;
      data.analysis.overallHealthScore = 100;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - executive summary', () => {
    it('should handle null executive summary', async () => {
      const data = makeEcosystemData();
      data.analysis.executiveSummary = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty executive summary', async () => {
      const data = makeEcosystemData();
      data.analysis.executiveSummary = '';
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle multi-paragraph executive summary', async () => {
      const data = makeEcosystemData();
      data.analysis.executiveSummary = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle very long executive summary', async () => {
      const data = makeEcosystemData();
      data.analysis.executiveSummary = 'This is a very detailed analysis. '.repeat(100);
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - mission analysis', () => {
    it('should handle null mission analysis', async () => {
      await generateEcosystemPdf(makeEcosystemData({ missionAnalysis: null }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle empty capability priorities', async () => {
      const data = makeEcosystemData();
      data.missionAnalysis.capabilityPriorities = [];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle capability priorities with low priority', async () => {
      const data = makeEcosystemData();
      data.missionAnalysis.capabilityPriorities = [
        { code: 'EE', name: 'Empathy & Ethics', priority: 'low', reasoning: 'Less relevant for this mission.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle mission analysis without summary', async () => {
      const data = makeEcosystemData();
      data.missionAnalysis.summary = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle capability priorities sorted by priority order', async () => {
      const data = makeEcosystemData();
      data.missionAnalysis.capabilityPriorities = [
        { code: 'EE', name: 'Empathy', priority: 'low', reasoning: 'Not critical.' },
        { code: 'HA', name: 'High Agency', priority: 'critical', reasoning: 'Very important.' },
        { code: 'IC', name: 'Curiosity', priority: 'medium', reasoning: 'Helpful.' },
        { code: 'RA', name: 'Resilience', priority: 'high', reasoning: 'Important.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle capability priority without reasoning', async () => {
      const data = makeEcosystemData();
      data.missionAnalysis.capabilityPriorities = [
        { code: 'HA', name: 'High Agency', priority: 'critical' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - capability gap analysis', () => {
    it('should handle empty capability gap matrix', async () => {
      const data = makeEcosystemData();
      data.analysis.capabilityGapMatrix = [];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null capability gap matrix', async () => {
      const data = makeEcosystemData();
      data.analysis.capabilityGapMatrix = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle gaps with different severity levels', async () => {
      const data = makeEcosystemData();
      data.analysis.capabilityGapMatrix = [
        { code: 'HA', capability: 'High Agency', currentScore: 30, targetScore: 90, gapAnalysis: 'Major gap.' },
        { code: 'IC', capability: 'Intellectual Curiosity', currentScore: 65, targetScore: 80, gapAnalysis: 'Moderate gap.' },
        { code: 'RA', capability: 'Resilience', currentScore: 80, targetScore: 75 },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle gap matrix using teamStrength and missionPriority fallbacks', async () => {
      const data = makeEcosystemData();
      data.analysis.capabilityGapMatrix = [
        { code: 'HA', capability: 'High Agency', teamStrength: 'critical', missionPriority: 'critical' },
        { code: 'IC', capability: 'Curiosity', teamStrength: 'strong', missionPriority: 'low' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - cumulative scores', () => {
    it('should handle empty cumulative scores', async () => {
      await generateEcosystemPdf(makeEcosystemData({ cumulativeScores: [] }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle cumulative scores with zero values', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        cumulativeScores: [
          { capability: 'High Agency', code: 'HA', score: 0, maxPossible: 300 },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle cumulative scores at maximum', async () => {
      await generateEcosystemPdf(makeEcosystemData({
        cumulativeScores: [
          { capability: 'High Agency', code: 'HA', score: 300, maxPossible: 300 },
        ],
      }));
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - risk alerts', () => {
    it('should handle no risk alerts', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = [];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null risk alerts', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle critical severity risk alerts', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = [
        { title: 'Critical Gap', severity: 'critical', description: 'Urgent capability gap.', recommendation: 'Act now.' },
        { title: 'Another Critical', severity: 'critical', description: 'Second urgent issue.', recommendation: 'Also urgent.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle warning severity risk alerts', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = [
        { title: 'Warning Alert', severity: 'warning', description: 'Needs attention.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle info severity risk alerts', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = [
        { title: 'Info Alert', severity: 'info', description: 'For your information.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle risk alert without recommendation', async () => {
      const data = makeEcosystemData();
      data.analysis.riskAlerts = [
        { title: 'No Rec Alert', severity: 'warning', description: 'No rec here.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - contextual insights', () => {
    it('should handle no contextual insights', async () => {
      const data = makeEcosystemData();
      data.analysis.contextualInsights = [];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null contextual insights', async () => {
      const data = makeEcosystemData();
      data.analysis.contextualInsights = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle string-type contextual insights', async () => {
      const data = makeEcosystemData();
      data.analysis.contextualInsights = [
        'Simple string insight one.',
        'Simple string insight two.',
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle all category types', async () => {
      const data = makeEcosystemData();
      data.analysis.contextualInsights = [
        { title: 'Dynamics', category: 'team_dynamics', analysis: 'Team dynamics analysis.' },
        { title: 'Future', category: 'future_needs', analysis: 'Future needs analysis.' },
        { title: 'Post-Hire', category: 'post_hire_outlook', analysis: 'Post-hire outlook.' },
        { title: 'Risk', category: 'strategic_risk', analysis: 'Strategic risk analysis.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - ideal candidate profile', () => {
    it('should handle no ideal candidate profile', async () => {
      const data = makeEcosystemData();
      data.analysis.idealCandidateProfile = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle ideal candidate profile without fit targets', async () => {
      const data = makeEcosystemData();
      data.analysis.idealCandidateProfile = { summary: 'Need a strong leader.' };
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle ideal candidate profile with multiple fit targets', async () => {
      const data = makeEcosystemData();
      data.analysis.idealCandidateProfile = {
        summary: 'Complex requirements.',
        fitTargets: {
          HA: { min: 80, ideal: 95, reasoning: 'High agency needed.' },
          IC: { min: 75, ideal: 90, reasoning: 'Curiosity needed.' },
          RA: { min: 70, ideal: 85, reasoning: 'Resilience needed.' },
          EE: { min: 60, ideal: 80, reasoning: 'Ethics needed.' },
          GM: { min: 65, ideal: 85, reasoning: 'Growth mindset needed.' },
          IA: { min: 70, ideal: 88, reasoning: 'Agility needed.' },
        },
      };
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - ideal hire profiles', () => {
    it('should handle no ideal hire profiles', async () => {
      const data = makeEcosystemData();
      data.analysis.idealHireProfiles = [];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle null ideal hire profiles', async () => {
      const data = makeEcosystemData();
      data.analysis.idealHireProfiles = null;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle multiple hire profiles', async () => {
      const data = makeEcosystemData();
      data.analysis.idealHireProfiles = [
        {
          priority: 1,
          roleTitle: 'Senior Dev',
          rationale: 'Needs backend help.',
          fitTargets: { HA: { min: 80, ideal: 95 } },
          keyBehaviors: ['Autonomy', 'Problem solving'],
          redFlags: ['Avoids challenge', 'Poor communication'],
        },
        {
          priority: 2,
          roleTitle: 'PM',
          rationale: 'Project leadership needed.',
          keyBehaviors: ['Organization'],
          redFlags: ['Micromanages'],
        },
        {
          priority: 3,
          roleTitle: 'Designer',
          rationale: 'UX improvement.',
        },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });

    it('should handle hire profile without key behaviors or red flags', async () => {
      const data = makeEcosystemData();
      data.analysis.idealHireProfiles = [
        { priority: 1, roleTitle: 'Simple Role', rationale: 'Basic need.' },
      ];
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - page management', () => {
    it('should set page footers and headers for all pages', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.setPage).toHaveBeenCalled();
      expect(mockPdfInstance.getNumberOfPages).toHaveBeenCalled();
    });

    it('should iterate all pages for header/footer', async () => {
      mockPdfInstance.getNumberOfPages.mockReturnValue(8);
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.setPage).toHaveBeenCalledTimes(8);
    });
  });

  describe('generateEcosystemPdf - error resilience', () => {
    it('should handle addImage throwing for logo gracefully', async () => {
      mockPdfInstance.addImage.mockImplementation(() => {
        throw new Error('Image load failed');
      });
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.text).toHaveBeenCalled();
      mockPdfInstance.addImage.mockImplementation(vi.fn());
    });

    it('should handle undefined analysis fields gracefully', async () => {
      const data = makeEcosystemData();
      data.analysis.missionAlignmentScore = undefined;
      data.analysis.overallHealthScore = undefined;
      data.analysis.teamSize = undefined;
      await generateEcosystemPdf(data);
      expect(mockPdfInstance.text).toHaveBeenCalled();
    });
  });

  describe('generateEcosystemPdf - additional services section', () => {
    it('should always render additional services section', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.text).toHaveBeenCalledWith(
        expect.stringContaining('ADDITIONAL SERVICES'),
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('should render contact information', async () => {
      await generateEcosystemPdf(makeEcosystemData());
      expect(mockPdfInstance.text).toHaveBeenCalledWith(
        'hello@humanmetrix.co.uk',
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
