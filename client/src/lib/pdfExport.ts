import jsPDF from 'jspdf';
import { FIT_SKILLS, AI_READINESS_SKILLS, ROLE_DEFINITIONS, normalizeAIReadinessScores, getAIReadinessScore } from './assessmentSkills';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { applyBodyText, applySubheading, applyHeading, applySmallText, applyLabelText, PDF_SPACING, savePdfMobile } from './pdfStyles';
import { getAIQBandInterpretation } from '@/data/aiq-questions';
import { PROMPT_ARCHITECTURE_DIMENSIONS, AIQ_BANDS } from '@/components/SkillsLegend';

// Mapping from short/legacy skill names to canonical names used in candidate data
const SKILL_NAME_MAPPING: Record<string, string> = {
  'AI Literacy': 'AI Literacy & Prompt Engineering',
  'Collaboration': 'Collaboration & Communication',
  'Domain Fluency': 'Data Fluency',
  'Responsible AI': 'Responsible AI & Ethical Awareness',
  'Technical Fluency': 'Technical Fundamentals',
  'Critical Thinking': 'Critical Thinking & Problem-Solving',
  'Adaptive Learning': 'Adaptability & Continuous Learning',
  'Creative Innovation': 'Creativity & Innovation',
};

// Find skill in candidate's scores, trying both original and normalized names
const findSkillInScores = (
  skillScores: Array<{ skillName: string; score: number | null; dataAvailable?: boolean; [key: string]: any }>,
  targetSkillName: string
): typeof skillScores[0] | undefined => {
  // Try exact match first
  let skill = skillScores.find(s => s.skillName === targetSkillName);
  if (skill) return skill;
  
  // Try normalized name
  const normalizedTarget = SKILL_NAME_MAPPING[targetSkillName] || targetSkillName;
  skill = skillScores.find(s => s.skillName === normalizedTarget);
  if (skill) return skill;
  
  // Try reverse lookup (if candidate has short name but we're looking for full name)
  const reverseMapping = Object.entries(SKILL_NAME_MAPPING).find(([_, full]) => full === targetSkillName);
  if (reverseMapping) {
    skill = skillScores.find(s => s.skillName === reverseMapping[0]);
    if (skill) return skill;
  }
  
  return undefined;
};

interface CandidateData {
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
    createdAt?: string | Date;
  };
  results?: any[];
}

interface ComparisonData {
  candidates: CandidateData[];
  fitAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  aiReadinessAssessments: Array<{ scores: Record<string, number>; completedAt: Date } | null>;
  promptArchitectureAssessments: Array<{
    levels: Array<{
      level: number;
      scores: { clarity: number; structure: number; contextRelevance: number; creativity: number; iterativeImprovement: number };
      totalScore: number;
      feedback: string;
    }>;
    totalScore: number;
    percentile: number;
    completedAt: Date;
  } | null>;
  aiqAssessments: Array<{ totalScore: number; scores: Record<string, number>; completedAt: Date } | null>;
  skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
  averageScores: number[];
  fitChartImages?: (string | null)[];
  aiChartImages?: (string | null)[];
  fitCombinedChartImage?: string | null;
  aiCombinedChartImage?: string | null;
  overallSkillsChartImage?: string | null;
  selectedRole?: string | null;
  roleData?: {
    id: string;
    name: string;
    description?: string;
    requiredSkillScores?: Record<string, any>;
  } | null;
  assessmentWeights?: {
    fit: number;
    aiReadiness: number;
    promptArchitecture: number;
    aiq: number;
  };
  employerRecommendation?: string;
  comparisonNextSteps?: string[];
}

interface RoleFitData {
  candidate: CandidateData;
  role: {
    name: string;
    description?: string;
  };
  criticalSkillNames?: string[];
  alignment: {
    overallFit: number | null;
    fitSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number | null;
      requiredScore: number;
      gap: number | null;
      alignment: string;
      criticality?: 'critical' | 'standard';
      dataAvailable?: boolean;
    }> | null;
    aiReadinessSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number | null;
      requiredScore: number;
      gap: number | null;
      alignment: string;
      criticality?: 'critical' | 'standard';
      dataAvailable?: boolean;
    }> | null;
    strengths: (string | { skill: string; summary: string; description: string })[];
    gaps: (string | { skill: string; summary: string; description: string })[];
    cohortBenchmarks?: {
      overall?: { percentile: number; totalCandidates: number; position: string };
      fit?: { percentile: number; totalCandidates: number; skillCount: number; avgScore: number };
      ai_readiness?: { percentile: number; totalCandidates: number; skillCount: number; avgScore: number };
      prompt_architecture?: { percentile: number; totalCandidates: number; avgScore: number };
      aiq?: { percentile: number; totalCandidates: number; avgScore: number };
    } | null;
    interviewQuestions?: Array<{
      question: string;
      purpose: string;
      targetSkill: string;
    }> | null;
    roleFlexibility?: Array<{
      roleId: string;
      roleName: string;
      fitScore: number;
      rawFitScore?: number;
      coveragePercent?: number;
      coverageLabel?: 'High' | 'Medium' | 'Limited';
      missingCriticalSkills?: string[];
      description?: string;
    }> | null;
    finalRecommendation?: string;
    nextSteps?: string[];
    promptRoleFitAnalysis?: string | null;
    aiqRoleFitAnalysis?: string | null;
  };
}

// Helper to add subtle background pattern to page
function addBackgroundPattern(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  // Clean white background - no border lines
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
}

// Helper to add header to each page
function addHeader(pdf: jsPDF, pageWidth: number) {
  // Clean white header background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 32, 'F');
  
  // HumanMetrix Logo - render with negative offset to crop whitespace
  // The logo image has built-in padding, so we position off-page to crop it
  try {
    pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', -6, -4, 48, 48);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  // Company name - positioned close to the visual logo content
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 34, 17);
  
  // Tagline - positioned directly below company name
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 34, 23);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to add footer to each page
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number, includeSkillsLegendNote: boolean = true) {
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  
  // Skills Legend note (except on last page which IS the skills legend)
  if (includeSkillsLegendNote && pageNum < totalPages) {
    pdf.setFontSize(7);
    pdf.text(
      'Skills Legend available on last page',
      pageWidth / 2,
      pageHeight - 12,
      { align: 'center' }
    );
    pdf.setFontSize(8);
  }
  
  pdf.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth / 2,
    pageHeight - 8,
    { align: 'center' }
  );
  pdf.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth - 15,
    pageHeight - 8,
    { align: 'right' }
  );
  pdf.text(
    '© HumanMetrix',
    15,
    pageHeight - 8
  );
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to add "How to Read Our Reports" guide page
function addReportGuidePage(pdf: jsPDF, pageWidth: number, pageHeight: number, reportType: 'rolefit' | 'comparison' | 'individual' | 'multi-candidate'): void {
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  
  // Title with blue background
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 28, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HOW TO READ OUR REPORTS', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A step-by-step guide for hiring managers and stakeholders', pageWidth / 2, yPos + 21, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 85; // More space between header and first content point
  
  // Helper for numbered items
  const addGuideItem = (num: number, title: string, description: string, y: number): number => {
    // Numbered circle
    pdf.setFillColor(59, 130, 246);
    pdf.circle(25, y, 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(num), 25, y + 1, { align: 'center' });
    
    // Title
    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 34, y + 1);
    
    // Description
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(description, pageWidth - 55);
    lines.forEach((line: string, idx: number) => {
      pdf.text(line, 34, y + 7 + (idx * 5));
    });
    
    return y + 10 + (lines.length * 5) + 6;
  };
  
  if (reportType === 'rolefit') {
    // Role Fit Report Guide - matches RoleFitTab.tsx exactly
    yPos = addGuideItem(1, 'Overall Role Fit Score', 
      'The weighted average of all skill scores against role requirements. 80%+ = Strong fit, 60-79% = Good potential, Below 60% = Development needed.', yPos);
    
    yPos = addGuideItem(2, 'Skill Alignments (FIT & AI Readiness)', 
      'Compare candidate scores vs. role requirements. Look for skills marked "C" (Critical) - these are essential for success.', yPos);
    
    yPos = addGuideItem(3, 'Critical Skills Analysis', 
      'Summary of skills marked as critical for this role. Shows how many critical requirements are met vs. gaps needing development.', yPos);
    
    yPos = addGuideItem(4, 'HumanMetrix Database Benchmarking', 
      'See how this candidate ranks against all other candidates in our database. Percentile shows their relative standing.', yPos);
    
    yPos = addGuideItem(5, 'Role Flexibility Analysis', 
      'Alternative roles where this candidate might excel if the primary role isn\'t ideal. Useful for internal mobility.', yPos);
  } else if (reportType === 'individual') {
    // Individual Report Guide - matches IndividualReportTab.tsx order exactly
    yPos = addGuideItem(1, 'Understanding Trait-Based Scores', 
      'FIT and AI Readiness are trait-based assessments. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.', yPos);
    
    yPos = addGuideItem(2, 'FIT Assessment (Behavioral)', 
      'Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores = stronger trait presence. Match against role requirements to assess fit.', yPos);
    
    yPos = addGuideItem(3, 'AI Readiness (Technical)', 
      'Measures 9 AI-related capabilities. Higher scores indicate stronger aptitude in each area. Compare to role requirements for relevance.', yPos);
    
    yPos = addGuideItem(4, 'Prompt Architecture', 
      'Evaluates AI prompt engineering skills across 4 difficulty levels. Each level tests clarity, structure, and creativity in prompt design.', yPos);
    
    yPos = addGuideItem(5, 'AIQ (Ethics)', 
      'Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Single overall score.', yPos);
    
    yPos = addGuideItem(6, 'Trait Profile Summary', 
      'Top 3 highest and lowest scoring traits across FIT and AI Readiness. Use Role Fit analysis to determine which traits matter for specific positions.', yPos);
  } else if (reportType === 'multi-candidate') {
    // Multi-Candidate Role Fit Report Guide - matches MultiCandidateRoleFitTab.tsx
    yPos = addGuideItem(1, 'Summary Cards', 
      'Quick overview showing the top performer, average fit score across all candidates, total candidate count, and distribution by fit tier (Strong 80%+, Moderate 60-79%, Development Needed below 60%).', yPos);
    
    yPos = addGuideItem(2, 'Cohort Insights', 
      'Common strengths shared by multiple candidates and common development areas where the cohort may need improvement. Key differentiators highlight what sets candidates apart.', yPos);
    
    yPos = addGuideItem(3, 'AI Comparative Analyses', 
      'AI-powered assessment of Prompt Architecture and AIQ skills across candidates (when applicable), with insights on relative strengths and areas for development.', yPos);
    
    yPos = addGuideItem(4, 'Candidate Rankings Table', 
      'Sortable table with rank, fit percentage, fit tier, and key notes. Top 3 candidates are highlighted with gold, silver, and bronze indicators.', yPos);
    
    yPos = addGuideItem(5, 'Critical Skills Dashboard', 
      'Table showing performance on must-have skills for this role. Each critical skill displays candidate scores with color coding and pass/fail indicators.', yPos);
    
    yPos = addGuideItem(6, 'Skill Score Interpretation', 
      'For each skill: Green = meets/exceeds requirement, Yellow = close to requirement (within 80%), Red = significant gap. "C" badge indicates critical skills.', yPos);
  } else {
    // Comparison Report Guide - matches CompareTab.tsx exactly
    yPos = addGuideItem(1, 'Candidate Overview', 
      'Quick view of each candidate\'s assessment completion. All 4 assessments should be completed for a complete picture.', yPos);
    
    yPos = addGuideItem(2, 'Composite Score', 
      'Weighted average across all assessments. Use the sliders to adjust weights based on role priorities (e.g., higher AI Readiness for tech roles).', yPos);
    
    yPos = addGuideItem(3, 'Skill-by-Skill Breakdown', 
      'Bar charts and tables show each candidate\'s strengths. Look for the highest scores in skills critical to your role.', yPos);
    
    yPos = addGuideItem(4, 'Role Fit Analysis (Separate Tool)', 
      'For detailed role-specific analysis including cohort benchmarking and hiring recommendations, use the Role Fit tab with individual candidates.', yPos);
    
    yPos = addGuideItem(5, 'Read the Recommendations', 
      'Review strengths, development areas, and insights for each candidate to inform your final decision.', yPos);
  }
  
}

// Helper to add Skills Legend page at the end of the PDF
function addSkillsLegendPage(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  
  // Page title
  yPos = addSectionHeader(pdf, 'SKILLS LEGEND', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Reference guide for all assessed competencies across the four assessment types', 20, yPos);
  yPos += 8;
  
  const leftMargin = 25;
  const indent = 5; // Indent for skill names within each section
  
  // All descriptions aligned at column 95 (accommodates longest: "AI Literacy & Prompt Engineering:")
  const descColumn = 95;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  FIT_SKILLS.forEach((skill) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${skill.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skill.description || '', descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  // AI Readiness Skills
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('AI Readiness - Technical Competencies', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  AI_READINESS_SKILLS.forEach((skill) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${skill.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    const descWidth = pageWidth - descColumn - 15;
    const descLines = pdf.splitTextToSize(skill.description || '', descWidth);
    pdf.text(descLines[0], descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  // Prompt Architecture Dimensions
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(234, 179, 8);
  pdf.text('Prompt Architecture - Evaluation Dimensions', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  PROMPT_ARCHITECTURE_DIMENSIONS.forEach((dim) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${dim.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dim.description, descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  // Check if we need a new page for AIQ bands
  if (yPos > pageHeight - 50) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
  }
  
  // AIQ Scoring Bands
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(147, 51, 234);
  pdf.text('AIQ - Algorithmic Integrity Quotient Bands', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  AIQ_BANDS.forEach((band) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${band.range} (${band.title}):`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(band.description, descColumn, yPos);
    yPos += 5;
  });
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to create section header
function addSectionHeader(pdf: jsPDF, title: string, yPosition: number, pageWidth: number): number {
  // Clear any previous draw color and set fill only
  pdf.setDrawColor(243, 244, 246);
  pdf.setFillColor(243, 244, 246);
  pdf.rect(20, yPosition, pageWidth - 40, 12, 'F');
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  // Title positioned in the middle of the box (yPosition + 8 for center of 12-height box)
  pdf.text(title, 25, yPosition + 8);
  pdf.setTextColor(0, 0, 0);
  
  return yPosition + 16;
}

// Helper to determine performance level - full color palette
function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Excellent', color: [34, 197, 94] };    // Green-500
  if (score >= 70) return { label: 'Good', color: [34, 197, 94] };         // Green-500
  if (score >= 55) return { label: 'Fair', color: [234, 179, 8] };         // Yellow-500
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };  // Orange-500
  return { label: 'Needs Development', color: [239, 68, 68] };             // Red-500
}

// Helper to determine performance level for FIT and AI Readiness - blue shades only
function getBluePerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Excellent', color: [30, 64, 175] };    // Blue-800
  if (score >= 70) return { label: 'Good', color: [37, 99, 235] };         // Blue-600
  if (score >= 55) return { label: 'Fair', color: [59, 130, 246] };        // Blue-500
  if (score >= 40) return { label: 'Developing', color: [96, 165, 250] };  // Blue-400
  return { label: 'Needs Development', color: [147, 197, 253] };           // Blue-300
}

// Candidate color palette for comparison - different shades of blue
const CANDIDATE_COLORS = [
  [37, 99, 235],    // Dark Blue (Blue-600)
  [96, 165, 250],   // Light Blue (Blue-400) - lighter for better differentiation
  [147, 197, 253],  // Very Light Blue (Blue-300)
];

// Helper to ensure sufficient page space, add new page if needed
function ensurePageSpace(pdf: jsPDF, yPos: number, requiredHeight: number, pageHeight: number, pageWidth: number): number {
  if (yPos + requiredHeight > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    return 32; // Start content closer to header to reduce whitespace
  }
  return yPos;
}

// Helper to draw a table row with borders
function drawTableRow(
  pdf: jsPDF,
  x: number,
  y: number,
  widths: number[],
  texts: string[],
  height: number,
  options: {
    isBold?: boolean;
    fontSize?: number;
    fillColor?: [number, number, number];
    textColor?: [number, number, number];
    drawBorders?: boolean;
  } = {}
) {
  const {
    isBold = false,
    fontSize = 8,
    fillColor,
    textColor = [0, 0, 0],
    drawBorders = true
  } = options;
  
  pdf.setFontSize(fontSize);
  pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
  pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  let currentX = x;
  
  widths.forEach((width, index) => {
    // Draw cell background
    if (fillColor) {
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.rect(currentX, y, width, height, 'F');
    }
    
    // Draw cell border
    if (drawBorders) {
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.1);
      pdf.rect(currentX, y, width, height, 'S');
    }
    
    // Draw text centered in cell
    if (texts[index]) {
      const textX = currentX + width / 2;
      const textY = y + height / 2 + 1.5;
      pdf.text(texts[index], textX, textY, { align: 'center' });
    }
    
    currentX += width;
  });
}

export async function exportComparisonPDF(data: ComparisonData) {
  // Guard against empty candidates array
  if (!data.candidates || data.candidates.length === 0) {
    console.error('Cannot generate comparison PDF: No candidates provided');
    return;
  }
  
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  // ========== PAGE 1: HOW TO READ OUR REPORTS GUIDE ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'comparison');
  
  // ========== PAGE 2: COVER + SUMMARY ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section
  yPos = 32;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CANDIDATE COMPARISON', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', pageWidth / 2, yPos + 20, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 27, { align: 'center' });
  
  // Show role comparison info if a role is selected
  if (data.selectedRole) {
    const roleName = data.roleData?.name || ROLE_DEFINITIONS[data.selectedRole]?.name || data.selectedRole;
    pdf.setFontSize(10);
    pdf.text(`Role Comparison: ${roleName}`, pageWidth / 2, yPos + 33, { align: 'center' });
  }
  
  pdf.setTextColor(0, 0, 0);
  
  yPos = 75;
  
  // Helper function to get candidate name
  function getCandidateName(candidate: any): string {
    return candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : candidate.user.email.split('@')[0];
  }
  
  // Skill abbreviation mapping (matching bar chart labels)
  const skillAbbreviations: Record<string, string> = {
    // FIT Skills
    'High Agency': 'HA',
    'Intellectual Curiosity': 'IC',
    'Resilience': 'RES',
    'Empathy & Ethics': 'E&E',
    'Growth Mindset': 'GM',
    'Interpersonal Agility': 'IA',
    // AI Readiness Skills
    'AI Literacy & Prompt Engineering': 'AI-PE',
    'Technical Fundamentals': 'TF',
    'Data Fluency': 'DF',
    'Critical Thinking & Problem-Solving': 'CT-PS',
    'Adaptability & Continuous Learning': 'ACL',
    'Collaboration & Communication': 'C&C',
    'Responsible AI & Ethical Awareness': 'RA-EA',
    'Creativity & Innovation': 'CI',
    'Domain Expertise': 'DE',
    // Legacy compatibility
    'Human-AI Collaboration': 'HAC',
  };
  
  // Helper to get skill name with abbreviation
  function getSkillWithAbbr(skillName: string): string {
    const abbr = skillAbbreviations[skillName];
    return abbr ? `${skillName} (${abbr})` : skillName;
  }
  
  // ========== CANDIDATE DETAILS (Brief) ==========
  yPos = addSectionHeader(pdf, 'CANDIDATE DETAILS', yPos, pageWidth);
  
  const candDetailsDesc = 'Overview of candidates included in this comparison report.';
  applySmallText(pdf);
  const candDetailsLines = pdf.splitTextToSize(candDetailsDesc, pageWidth - 48);
  const candDetailsBoxH = Math.max(10, candDetailsLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, candDetailsBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(candDetailsLines, 24, yPos + 4);
  yPos += candDetailsBoxH + 3;
  
  // Draw candidate details in boxes - compact horizontal layout
  const candidateBoxWidth = (pageWidth - 40 - (data.candidates.length - 1) * 5) / data.candidates.length;
  const candidateBoxHeight = 24;
  let candX = 20;
  
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(candX, yPos, candidateBoxWidth, candidateBoxHeight, 2, 2, 'FD');
    
    const textStartX = candX + 4;
    const maxTextWidth = candidateBoxWidth - 8;
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const nameText = getCandidateName(candidate);
    const nameLines = pdf.splitTextToSize(nameText, maxTextWidth);
    pdf.text(nameLines.slice(0, 1), textStartX, yPos + 7);
    const nameEndY = yPos + 7 + (Math.min(nameLines.length, 1) - 1) * 4.5;
    
    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const emailText = candidate.user.email || '';
    const emailLines = pdf.splitTextToSize(emailText, maxTextWidth);
    const emailToRender = emailLines.slice(0, 2);
    let emailY = nameEndY + 5;
    emailToRender.forEach((line: string) => {
      pdf.text(line, textStartX, emailY);
      emailY += 3.5;
    });
    
    candX += candidateBoxWidth + 5;
  });
  
  yPos += candidateBoxHeight + 5;
  
  // Assessment Completion Status - IMPROVED TABLE
  yPos = addSectionHeader(pdf, 'COMPLETION STATUS', yPos, pageWidth);
  
  const completionDesc = 'Tracks which of the four core assessments each candidate has completed.';
  applySmallText(pdf);
  const completionDescLines = pdf.splitTextToSize(completionDesc, pageWidth - 48);
  const completionDescBoxH = Math.max(10, completionDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, completionDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(completionDescLines, 24, yPos + 4);
  yPos += completionDescBoxH + 3;
  
  const assessmentNames = ['FIT Assessment', 'AI Readiness', 'Prompt Architecture', 'AIQ'];
  const assessmentData = [
    data.fitAssessments,
    data.aiReadinessAssessments,
    data.promptArchitectureAssessments,
    data.aiqAssessments
  ];
  
  // Calculate dynamic column widths - match right margin with ranking table
  const tableStartX = 20;
  const assessmentColWidth = 50;
  const rightMargin = 25; // Match the ranking table's right margin
  const availableWidth = pageWidth - tableStartX - rightMargin;
  const candidateColWidth = Math.max(35, (availableWidth - assessmentColWidth) / data.candidates.length);
  const rowHeight = 7;
  
  // Header row
  const headerWidths = [assessmentColWidth, ...Array(data.candidates.length).fill(candidateColWidth)];
  const headerTexts = ['Assessment', ...data.candidates.map(c => getCandidateName(c))];
  drawTableRow(pdf, tableStartX, yPos, headerWidths, headerTexts, rowHeight, {
    isBold: true,
    fontSize: 8,
    fillColor: [249, 250, 251],
    textColor: [17, 24, 39]
  });
  yPos += rowHeight;
  
  // Data rows with green indicators
  assessmentNames.forEach((aName, aIndex) => {
    // Draw assessment name cell
    applySmallText(pdf);
    
    // Draw borders for first column
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.rect(tableStartX, yPos, assessmentColWidth, rowHeight, 'S');
    pdf.text(aName, tableStartX + 2, yPos + rowHeight * 0.6);
    
    // Draw candidate completion cells with green boxes
    let currentX = tableStartX + assessmentColWidth;
    data.candidates.forEach((_, candIndex) => {
      const isCompleted = (assessmentData[aIndex]?.[candIndex] ?? null) !== null;
      
      // Draw cell border
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(currentX, yPos, candidateColWidth, rowHeight, 'S');
      
      if (isCompleted) {
        // Show "Complete" text in green
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(34, 197, 94); // Green-500
        pdf.text('Complete', currentX + candidateColWidth / 2, yPos + rowHeight * 0.6, { align: 'center' });
        pdf.setTextColor(75, 85, 99);
      }
      // Leave blank if incomplete (no text or indicator)
      
      currentX += candidateColWidth;
    });
    
    yPos += rowHeight;
  });
  
  yPos += 3;
  pdf.setTextColor(0, 0, 0);
  
  // --- OVERALL RANKING & COMPOSITE SCORE (moved to page 1) ---
  yPos += 5;
  yPos = addSectionHeader(pdf, 'OVERALL RANKING & COMPOSITE SCORE', yPos, pageWidth);
  yPos += 3;
  
  // Add explanation text - dynamically describe weights
  applySmallText(pdf);
  const weights = data.assessmentWeights || { fit: 25, aiReadiness: 25, promptArchitecture: 25, aiq: 25 };
  const isEqualWeights = weights.fit === 25 && weights.aiReadiness === 25 && weights.promptArchitecture === 25 && weights.aiq === 25;
  const compositeExplanation = isEqualWeights 
    ? 'This ranking applies equal weights across FIT, AI Readiness, Prompt Architecture, and AIQ assessments to deliver a balanced composite score. Higher scores indicate stronger overall performance across all evaluated competencies.'
    : `This ranking applies custom weights: FIT (${weights.fit}%), AI Readiness (${weights.aiReadiness}%), Prompt Architecture (${weights.promptArchitecture}%), AIQ (${weights.aiq}%). Higher scores indicate stronger overall performance across all evaluated competencies.`;
  const splitCompositeExplanation = pdf.splitTextToSize(compositeExplanation, pageWidth - 40);
  pdf.text(splitCompositeExplanation, 20, yPos);
  yPos += splitCompositeExplanation.length * 4 + 5;
  
  // Calculate composite scores using passed weights (or default equal 25% each)
  const calculatePDFCompositeScore = (candidateIndex: number): number => {
    const assessmentData: Array<{ score: number; weight: number }> = [];
    
    // FIT average
    const fitData = data.fitAssessments?.[candidateIndex];
    if (fitData) {
      const fitScores = Object.values(fitData.scores);
      if (fitScores.length > 0) {
        const fitAvg = fitScores.reduce((a, b) => a + b, 0) / fitScores.length;
        assessmentData.push({ score: fitAvg, weight: weights.fit });
      }
    }
    
    // AI Readiness average
    const aiData = data.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      const aiScores = Object.values(aiData.scores);
      if (aiScores.length > 0) {
        const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        assessmentData.push({ score: aiAvg, weight: weights.aiReadiness });
      }
    }
    
    // Prompt Architecture
    const promptData = data.promptArchitectureAssessments?.[candidateIndex];
    if (promptData) {
      assessmentData.push({ score: promptData.totalScore, weight: weights.promptArchitecture });
    }
    
    // AIQ
    const aiqData = data.aiqAssessments?.[candidateIndex];
    if (aiqData) {
      assessmentData.push({ score: aiqData.totalScore, weight: weights.aiq });
    }
    
    if (assessmentData.length === 0) return 0;
    
    const totalWeight = assessmentData.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = assessmentData.reduce((sum, d) => sum + d.score * d.weight, 0);
    return Math.round(weightedSum / totalWeight);
  };
  
  // Get all candidate skills for a given candidate
  const getAllCandidateSkillsPDF = (candidateIndex: number): Record<string, number> => {
    const skills: Record<string, number> = {};
    
    const fitData = data.fitAssessments?.[candidateIndex];
    if (fitData) {
      Object.entries(fitData.scores).forEach(([key, value]) => {
        skills[key] = value;
      });
    }
    
    const aiData = data.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      Object.entries(aiData.scores).forEach(([key, value]) => {
        skills[key] = value;
      });
    }
    
    const aiqData = data.aiqAssessments?.[candidateIndex];
    if (aiqData && aiqData.scores) {
      Object.entries(aiqData.scores).forEach(([key, value]) => {
        skills[key] = value;
      });
    }
    
    return skills;
  };
  
  // Calculate rankings
  const rankings = data.candidates.map((_, index) => ({
    candidateIndex: index,
    score: calculatePDFCompositeScore(index),
    rank: 0,
  }));
  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((item, idx) => {
    item.rank = idx + 1;
  });
  
  // Draw ranking table
  const rankTableStartX = 20;
  const rankColWidths = [15, 75, 40, 35]; // Rank, Name, Composite Score, Status
  const rankRowHeight = 7;
  
  // Header
  drawTableRow(pdf, rankTableStartX, yPos, rankColWidths, 
    ['Rank', 'Candidate', 'Composite Score', 'Status'], rankRowHeight, {
    isBold: true,
    fontSize: 8,
    fillColor: [249, 250, 251],
    textColor: [17, 24, 39]
  });
  yPos += rankRowHeight;
  
  // Data rows
  rankings.forEach((ranking) => {
    const candidate = data.candidates[ranking.candidateIndex];
    const name = getCandidateName(candidate);
    const shortName = name.length > 22 ? name.substring(0, 20) + '...' : name;
    
    const status = ranking.score >= 80 ? 'Excellent' : 
                   ranking.score >= 70 ? 'Strong' :
                   ranking.score >= 60 ? 'Good' : 'Developing';
    
    const candidateColor = CANDIDATE_COLORS[ranking.candidateIndex] || [100, 100, 100];
    
    // Draw rank with medal for top 3 positions only
    applySmallText(pdf);
    pdf.setFont('helvetica', 'bold');
    if (ranking.rank === 1) {
      pdf.setTextColor(245, 158, 11); // Gold
    } else if (ranking.rank === 2) {
      pdf.setTextColor(156, 163, 175); // Silver
    } else if (ranking.rank === 3) {
      pdf.setTextColor(180, 83, 9); // Bronze
    } else {
      pdf.setTextColor(107, 114, 128); // Gray for rank 4+
    }
    pdf.text(`#${ranking.rank}`, rankTableStartX + 7, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
    // Draw name with candidate color
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(shortName, rankTableStartX + 15 + 2, yPos + rankRowHeight / 2 + 1);
    
    // Composite score
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${ranking.score}`, rankTableStartX + 90 + 15, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
    // Status badge
    const statusColor = status === 'Excellent' ? [34, 197, 94] :
                        status === 'Strong' ? [59, 130, 246] :
                        status === 'Good' ? [245, 158, 11] : [107, 114, 128];
    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.text(status, rankTableStartX + 130 + 17, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
    // Draw cell borders
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    let xOffset = rankTableStartX;
    rankColWidths.forEach(width => {
      pdf.rect(xOffset, yPos, width, rankRowHeight, 'S');
      xOffset += width;
    });
    
    yPos += rankRowHeight;
  });
  yPos += 5;
  
  // Note about weights - dynamically reflect actual weights
  applySmallText(pdf);
  pdf.setFont('helvetica', 'italic');
  const weightsNote = isEqualWeights 
    ? '* Composite score calculated with equal weight (25%) for each assessment type'
    : `* Composite score calculated with weights: FIT ${weights.fit}%, AI Readiness ${weights.aiReadiness}%, Prompt ${weights.promptArchitecture}%, AIQ ${weights.aiq}%`;
  pdf.text(weightsNote, 20, yPos);
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILLS CHARTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 32;
  
  // FIT Assessment Bar Charts
  const hasFIT = data.fitAssessments?.some(a => a !== null);
  if (hasFIT && data.fitChartImages) {
    yPos = addSectionHeader(pdf, 'FIT ASSESSMENT COMPARISON', yPos, pageWidth);
    
    // Add description for FIT assessment
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Behavioral assessment measuring core competencies: agency, curiosity, resilience, empathy, and collaboration.', 20, yPos);
    yPos += 6;
    
    const fitCharts = data.fitChartImages.filter(img => img !== null);
    const chartsPerRow = Math.min(fitCharts.length, 2);
    const columnWidth = (pageWidth - 30) / chartsPerRow;
    const chartWidth = 85; // Horizontally stretched within 4:3 aspect container
    const chartHeight = 58;
    
    fitCharts.forEach((image, index) => {
      if (!image) return;
      // Center the chart within its column
      const columnStart = 15 + (index % chartsPerRow) * columnWidth;
      const xPos = columnStart + (columnWidth - chartWidth) / 2;
      const chartYPos = yPos + Math.floor(index / chartsPerRow) * (chartHeight + 5);
      
      pdf.addImage(image, 'JPEG', xPos, chartYPos, chartWidth, chartHeight);
    });
    
    yPos += Math.ceil(fitCharts.length / chartsPerRow) * (chartHeight + 5) + 3;
    
    // FIT Score Table - PROPER TABLE FORMAT
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    
    applySubheading(pdf);
    pdf.text('FIT Skills Comparison', 20, yPos);
    yPos += 5;
    
    // Show ALL FIT skills using exact key matching
    const fitSkillKeys = FIT_SKILLS.map(s => s.key);
    const fitSkillData = data.skillComparison.filter(skill => 
      fitSkillKeys.includes(skill.skillName)
    );
    
    const fitTableStartX = 20;
    const fitSkillColWidth = 60;
    const fitRightMargin = 25; // Match other tables' right margin
    const fitAvailableWidth = pageWidth - fitTableStartX - fitRightMargin;
    const fitScoreColWidth = Math.max(25, (fitAvailableWidth - fitSkillColWidth) / data.candidates.length);
    const fitRowHeight = 6;
    
    // Header row
    const fitHeaderWidths = [fitSkillColWidth, ...Array(data.candidates.length).fill(fitScoreColWidth)];
    const fitHeaderTexts = ['Skill', ...data.candidates.map(c => getCandidateName(c))];
    drawTableRow(pdf, fitTableStartX, yPos, fitHeaderWidths, fitHeaderTexts, fitRowHeight, {
      isBold: true,
      fontSize: 8,
      fillColor: [249, 250, 251],
      textColor: [17, 24, 39]
    });
    yPos += fitRowHeight;
    
    // Data rows
    fitSkillData.forEach((skill) => {
      const rowTexts = [getSkillWithAbbr(skill.skillName)];
      skill.scores.forEach(score => {
        rowTexts.push(score !== null ? `${score}` : '—');
      });
      
      drawTableRow(pdf, fitTableStartX, yPos, fitHeaderWidths, rowTexts, fitRowHeight, {
        fontSize: 8,
        textColor: [55, 65, 81]
      });
      yPos += fitRowHeight;
    });
    
    yPos += 10; // Increased breathing room before AI READINESS section
  }
  
  // AI Readiness Bar Charts - ALWAYS start on a new page to keep chart + table together
  const hasAI = data.aiReadinessAssessments?.some(a => a !== null);
  if (hasAI && data.aiChartImages) {
    // Always start AI Readiness section on a new page
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;
    
    yPos = addSectionHeader(pdf, 'AI READINESS COMPARISON', yPos, pageWidth);
    
    // Add description for AI Readiness assessment
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Evaluates preparedness for AI-augmented work across technical fluency, problem-solving, and human-AI collaboration.', 20, yPos);
    yPos += 6;
    
    const aiCharts = data.aiChartImages.filter(img => img !== null);
    const aiChartsPerRow = Math.min(aiCharts.length, 2);
    const aiColumnWidth = (pageWidth - 30) / aiChartsPerRow;
    const aiChartWidth = 85;
    const aiChartHeight = 87;
    
    aiCharts.forEach((image, index) => {
      if (!image) return;
      // Center the chart within its column
      const columnStart = 15 + (index % aiChartsPerRow) * aiColumnWidth;
      const xPos = columnStart + (aiColumnWidth - aiChartWidth) / 2;
      const chartYPos = yPos + Math.floor(index / aiChartsPerRow) * (aiChartHeight + 5);
      
      pdf.addImage(image, 'JPEG', xPos, chartYPos, aiChartWidth, aiChartHeight);
    });
    
    yPos += Math.ceil(aiCharts.length / aiChartsPerRow) * (aiChartHeight + 5) + 3;
    
    // AI Readiness Score Table - PROPER TABLE FORMAT
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    
    applySubheading(pdf);
    pdf.text('AI Readiness Skills Comparison', 20, yPos);
    yPos += 5;
    
    // Show ALL AI Readiness skills using exact key matching
    const aiSkillKeys = AI_READINESS_SKILLS.map(s => s.key);
    const aiSkillData = data.skillComparison.filter(skill => 
      aiSkillKeys.includes(skill.skillName)
    );
    
    const aiTableStartX = 20;
    const aiSkillColWidth = 60;
    const aiRightMargin = 25; // Match other tables' right margin
    const aiAvailableWidth = pageWidth - aiTableStartX - aiRightMargin;
    const aiScoreColWidth = Math.max(25, (aiAvailableWidth - aiSkillColWidth) / data.candidates.length);
    const aiRowHeight = 6;
    
    // Header row
    const aiHeaderWidths = [aiSkillColWidth, ...Array(data.candidates.length).fill(aiScoreColWidth)];
    const aiHeaderTexts = ['Skill', ...data.candidates.map(c => getCandidateName(c))];
    drawTableRow(pdf, aiTableStartX, yPos, aiHeaderWidths, aiHeaderTexts, aiRowHeight, {
      isBold: true,
      fontSize: 8,
      fillColor: [249, 250, 251],
      textColor: [17, 24, 39]
    });
    yPos += aiRowHeight;
    
    // Data rows
    aiSkillData.forEach((skill) => {
      const rowTexts = [getSkillWithAbbr(skill.skillName)];
      skill.scores.forEach(score => {
        rowTexts.push(score !== null ? `${score}` : '—');
      });
      
      drawTableRow(pdf, aiTableStartX, yPos, aiHeaderWidths, rowTexts, aiRowHeight, {
        fontSize: 8,
        textColor: [55, 65, 81]
      });
      yPos += aiRowHeight;
    });
    
    yPos += 12; // More breathing room before Overall Skills section
  }

  // Overall Skills Comparison Chart
  if (data.overallSkillsChartImage) {
    if (yPos > pageHeight - 160) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 32;
    }
    
    yPos = addSectionHeader(pdf, 'OVERALL SKILLS COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    // Add description
    applySmallText(pdf);
    pdf.text('Combined view of all skill-based assessments (FIT + AI Readiness + AIQ)', 20, yPos);
    yPos += 3;
    
    // Use larger dimensions - 170mm height for bigger skills chart
    const imgProps = pdf.getImageProperties(data.overallSkillsChartImage);
    const maxWidth = pageWidth - 25; // Wider margins for bigger chart
    const maxHeight = 170; // Larger height for bigger chart display
    const scale = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
    const chartWidth = imgProps.width * scale;
    const chartHeight = imgProps.height * scale;
    const xPos = (pageWidth - chartWidth) / 2;
    
    pdf.addImage(data.overallSkillsChartImage, 'JPEG', xPos, yPos, chartWidth, chartHeight);
    yPos += chartHeight + 8;
  }
  
  // AIQ Summary - keep on same page as Overall Skills when possible
  const hasAIQ = data.aiqAssessments?.some(a => a !== null);
  if (hasAIQ) {
    // Only add page break if not enough room for AIQ section (approximately 60mm needed)
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 32;
    }
    
    yPos = addSectionHeader(pdf, 'AIQ (ARTIFICIAL INTELLIGENCE QUOTIENT)', yPos, pageWidth);
    
    // Add description for AIQ section
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    const aiqDesc = 'Measures understanding of AI ethics, bias awareness, fairness, and responsible AI governance.';
    pdf.text(aiqDesc, 20, yPos);
    yPos += 5;
    
    // AIQ candidates in boxes - horizontal layout to save space
    const aiqBoxWidth = (pageWidth - 40 - (data.candidates.length - 1) * 4) / data.candidates.length;
    const aiqBoxHeight = 18;
    let aiqBoxX = 20;
    
    data.candidates.forEach((candidate, index) => {
      const aiqData = data.aiqAssessments?.[index];
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      
      // Draw box with light background and colored outline only
      pdf.setFillColor(248, 250, 252);
      pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(aiqBoxX, yPos, aiqBoxWidth, aiqBoxHeight, 2, 2, 'FD');
      
      const textStartX = aiqBoxX + 4;
      
      // Candidate name
      const name = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
        : `Candidate ${index + 1}`;
      const maxNameLen = Math.floor(aiqBoxWidth / 3);
      const shortName = name.length > maxNameLen ? name.substring(0, maxNameLen - 2) + '...' : name;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      pdf.text(shortName, textStartX, yPos + 5);
      
      if (aiqData) {
        const aiqBand = getAIQBandInterpretation(aiqData.totalScore);
        const getBandColor = (score: number): [number, number, number] => {
          if (score >= 80) return [34, 197, 94];
          if (score >= 60) return [59, 130, 246];
          if (score >= 40) return [245, 158, 11];
          if (score >= 20) return [249, 115, 22];
          return [239, 68, 68];
        };
        
        // Score
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Score: ${aiqData.totalScore}/100`, textStartX, yPos + 10);
        
        // Status with band color - use smaller font to fit full text
        const bandColor = getBandColor(aiqData.totalScore);
        pdf.setTextColor(bandColor[0], bandColor[1], bandColor[2]);
        pdf.setFontSize(7);
        pdf.text(aiqBand.title, textStartX, yPos + 15);
      } else {
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text('N/A', textStartX, yPos + 10);
      }
      
      aiqBoxX += aiqBoxWidth + 4;
    });
    
    yPos += aiqBoxHeight + 3;
    
    // AIQ Comparison Explanation
    const aiqScoresSorted = data.candidates
      .map((c, i) => ({ name: getCandidateName(c), score: data.aiqAssessments?.[i]?.totalScore ?? null, index: i }))
      .filter(c => c.score !== null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) as Array<{name: string; score: number; index: number}>;
    
    if (aiqScoresSorted.length >= 2) {
      const top = aiqScoresSorted[0];
      const second = aiqScoresSorted[1];
      const diff = top.score - second.score;
      
      yPos += 3;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      
      const topLevel = top.score >= 80 ? 'exceptional' : top.score >= 70 ? 'strong' : top.score >= 60 ? 'adequate' : 'developing';
      let aiqText = `AIQ Analysis: ${top.name} demonstrates ${topLevel} understanding of AI ethics with a score of ${top.score}/100.`;
      if (diff > 0) {
        aiqText += ` This is ${diff} points higher than ${second.name} (${second.score}/100).`;
      }
      aiqText += ' Higher AIQ indicates better preparedness for responsible AI governance.';
      
      const splitAiqText = pdf.splitTextToSize(aiqText, pageWidth - 48);
      pdf.text(splitAiqText, 24, yPos + 6);
      yPos += 18;
    }
    
    yPos += 5;
  }
  
  // Prompt Architecture - Total Level Scores
  const hasPrompt = data.promptArchitectureAssessments?.some(a => a !== null);
  if (hasPrompt) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += 8; // More breathing room before Prompt Architecture section
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE COMPARISON', yPos, pageWidth);
    
    const promptCompDesc = 'Evaluates ability to craft effective AI prompts across 7 progressive difficulty levels, measuring clarity, structure, context relevance, creativity, and iterative improvement skills.';
    applySmallText(pdf);
    const promptCompDescLines = pdf.splitTextToSize(promptCompDesc, pageWidth - 48);
    const promptCompDescBoxH = Math.max(10, promptCompDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, promptCompDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(promptCompDescLines, 24, yPos + 4);
    yPos += promptCompDescBoxH + 3;
    
    // Table header
    applySmallText(pdf);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Level', 25, yPos);
    
    // Candidate name headers with color coding
    const numCandidates = data.candidates.length;
    const scoreColWidth = Math.min(55, (pageWidth - 85) / numCandidates);
    data.candidates.forEach((candidate, index) => {
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      const name = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
        : `Candidate ${index + 1}`;
      const shortName = name.length > 15 ? name.substring(0, 13) + '...' : name;
      const headerX = 60 + (index * scoreColWidth);
      pdf.text(shortName, headerX, yPos);
    });
    yPos += 4;
    
    // Render all 7 levels
    for (let level = 1; level <= 7; level++) {
      applySmallText(pdf);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Level ${level}`, 25, yPos + 3);
      
      // Candidate scores with bars
      data.candidates.forEach((candidate, candIndex) => {
        const promptData = data.promptArchitectureAssessments?.[candIndex];
        const colX = 60 + (candIndex * scoreColWidth);
        
        if (promptData && promptData.levels && promptData.levels[level - 1]) {
          const levelData = promptData.levels[level - 1];
          const score = levelData.totalScore || 0;
          const maxScore = 100;
          const barWidth = Math.min(35, scoreColWidth - 15);
          const barLength = (score / maxScore) * barWidth;
          
          // Score text on the left
          applySmallText(pdf);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(`${score}`, colX, yPos + 3);
          
          // Background bar
          pdf.setFillColor(229, 231, 235);
          pdf.rect(colX + 8, yPos + 0.5, barWidth, 4, 'F');
          
          // Score bar with candidate color
          const candidateColor = CANDIDATE_COLORS[candIndex] || [100, 100, 100];
          pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
          pdf.rect(colX + 8, yPos + 0.5, barLength, 4, 'F');
        } else {
          applySmallText(pdf);
          pdf.setTextColor(150, 150, 150);
          pdf.text('—', colX, yPos + 3);
        }
      });
      
      yPos += 7;
    }
    
    // Prompt Architecture Analysis Summary
    const promptScores = data.candidates.map((candidate, index) => {
      const promptData = data.promptArchitectureAssessments?.[index];
      return {
        name: getCandidateName(candidate),
        score: promptData?.totalScore || 0,
        levelsCompleted: promptData?.levels?.filter((l: any) => l.totalScore > 0).length || 0
      };
    }).sort((a, b) => b.score - a.score);
    
    if (promptScores.length >= 2 && promptScores[0].score > 0) {
      const topPrompt = promptScores[0];
      const secondPrompt = promptScores[1];
      const promptDiff = topPrompt.score - secondPrompt.score;
      
      yPos += 3;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      
      const promptLevel = topPrompt.score >= 80 ? 'advanced' : topPrompt.score >= 70 ? 'proficient' : topPrompt.score >= 60 ? 'competent' : 'developing';
      let promptText = `Prompt Analysis: ${topPrompt.name} shows ${promptLevel} prompt engineering skills with a score of ${topPrompt.score}/100.`;
      // Only compare if second candidate actually completed the assessment (score > 0)
      if (promptDiff > 0 && secondPrompt.score > 0) {
        promptText += ` This is ${promptDiff} points ahead of ${secondPrompt.name} (${secondPrompt.score}/100).`;
      } else if (secondPrompt.score === 0) {
        promptText += ` ${secondPrompt.name} has not completed this assessment.`;
      }
      promptText += ' Strong prompt architecture indicates ability to effectively leverage AI tools.';
      
      const splitPromptText = pdf.splitTextToSize(promptText, pageWidth - 48);
      pdf.text(splitPromptText, 24, yPos + 6);
      yPos += 18;
    }
    
    yPos += 10; // More space before next section
  }
  
  // Strengths & Development Areas - Side by Side Comparison
  if (yPos > pageHeight - 80) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;
  }
  
  yPos = addSectionHeader(pdf, 'STRENGTHS & DEVELOPMENT AREAS', yPos, pageWidth);
  
  const strengthsDesc = 'Highlights each candidate\'s top 3 strongest skills and areas requiring development, based on assessment scores across all completed evaluations.';
  applySmallText(pdf);
  const strengthsDescLines = pdf.splitTextToSize(strengthsDesc, pageWidth - 48);
  const strengthsDescBoxH = Math.max(10, strengthsDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, strengthsDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(strengthsDescLines, 24, yPos + 4);
  yPos += strengthsDescBoxH + 3;
  
  // Helper to get candidate's top strengths and development areas
  const getCandidateStrengthsAndWeaknesses = (candidateIndex: number) => {
    const allSkills: Array<{ name: string; score: number }> = [];
    
    // Collect all skills from skill comparison for this candidate
    data.skillComparison.forEach(skill => {
      const score = skill.scores[candidateIndex];
      if (score !== null && score !== undefined) {
        allSkills.push({ name: skill.skillName, score });
      }
    });
    
    // Sort by score
    const sorted = [...allSkills].sort((a, b) => b.score - a.score);
    const strengths = sorted.slice(0, 3);
    const weaknesses = sorted.slice(-3).reverse();
    
    return { strengths, weaknesses };
  };
  
  // Calculate column width based on number of candidates
  const numCandidates = data.candidates.length;
  const columnWidth = (pageWidth - 40) / numCandidates;
  const startX = 20;
  
  // Draw candidate headers with colored indicators
  data.candidates.forEach((candidate, index) => {
    const colX = startX + (index * columnWidth);
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    
    // Color indicator circle
    pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.circle(colX + 3, yPos + 2, 2, 'F');
    
    // Candidate name
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    const fullName = getCandidateName(candidate);
    const displayName = fullName.length > 18 ? fullName.substring(0, 16) + '...' : fullName;
    pdf.text(displayName, colX + 8, yPos + 3.5);
  });
  
  yPos += 10;
  
  // Draw Strengths section
  applySmallText(pdf);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 139, 34); // Green color for strengths
  pdf.text('TOP STRENGTHS', startX, yPos);
  yPos += 5;
  
  // Draw strengths for each candidate in columns
  for (let skillIndex = 0; skillIndex < 3; skillIndex++) {
    data.candidates.forEach((candidate, candIndex) => {
      const colX = startX + (candIndex * columnWidth);
      const { strengths } = getCandidateStrengthsAndWeaknesses(candIndex);
      const strength = strengths[skillIndex];
      
      if (strength) {
        applySmallText(pdf);
        const maxNameWidth = columnWidth - 18;
        const skillName = strength.name;
        let truncatedName = skillName;
        while (pdf.getTextWidth(truncatedName) > maxNameWidth && truncatedName.length > 3) {
          truncatedName = truncatedName.slice(0, -1);
        }
        if (truncatedName !== skillName) truncatedName = truncatedName.trim() + '..';
        pdf.text(truncatedName, colX, yPos);
        
        pdf.setFont('helvetica', 'bold');
        const scoreColor = strength.score >= 80 ? [34, 139, 34] : strength.score >= 60 ? [59, 130, 246] : [107, 114, 128];
        pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.text(`${strength.score}`, colX + columnWidth - 12, yPos);
      }
    });
    yPos += 7;
  }
  
  yPos += 8;
  
  // Draw Development Areas section
  applySmallText(pdf);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(220, 120, 50); // Amber color for development areas
  pdf.text('DEVELOPMENT AREAS', startX, yPos);
  yPos += 5;
  
  // Draw weaknesses for each candidate in columns
  for (let skillIndex = 0; skillIndex < 3; skillIndex++) {
    data.candidates.forEach((candidate, candIndex) => {
      const colX = startX + (candIndex * columnWidth);
      const { weaknesses } = getCandidateStrengthsAndWeaknesses(candIndex);
      const weakness = weaknesses[skillIndex];
      
      if (weakness) {
        applySmallText(pdf);
        const maxNameWidth = columnWidth - 18;
        const skillName = weakness.name;
        let truncatedWName = skillName;
        while (pdf.getTextWidth(truncatedWName) > maxNameWidth && truncatedWName.length > 3) {
          truncatedWName = truncatedWName.slice(0, -1);
        }
        if (truncatedWName !== skillName) truncatedWName = truncatedWName.trim() + '..';
        pdf.text(truncatedWName, colX, yPos);
        
        pdf.setFont('helvetica', 'bold');
        const scoreColor = weakness.score < 50 ? [220, 38, 38] : weakness.score < 65 ? [220, 120, 50] : [107, 114, 128];
        pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.text(`${weakness.score}`, colX + columnWidth - 12, yPos);
      }
    });
    yPos += 7;
  }
  
  // Strengths & Development Areas Analysis Summary
  const candidateProfiles = data.candidates.map((candidate, index) => {
    const { strengths, weaknesses } = getCandidateStrengthsAndWeaknesses(index);
    return {
      name: getCandidateName(candidate),
      topStrength: strengths[0],
      topWeakness: weaknesses[weaknesses.length - 1],
      strengthAvg: strengths.length > 0 ? Math.round(strengths.reduce((sum, s) => sum + s.score, 0) / strengths.length) : 0,
      weaknessAvg: weaknesses.length > 0 ? Math.round(weaknesses.reduce((sum, w) => sum + w.score, 0) / weaknesses.length) : 0
    };
  }).sort((a, b) => b.strengthAvg - a.strengthAvg);
  
  if (candidateProfiles.length >= 2 && candidateProfiles[0].topStrength) {
    yPos += 3;
    
    const topProfile = candidateProfiles[0];
    const secondProfile = candidateProfiles[1];
    let profileText = `Skills Analysis: ${topProfile.name} leads in top strengths averaging ${topProfile.strengthAvg}/100, excelling in ${topProfile.topStrength.name} (${topProfile.topStrength.score}/100).`;
    if (topProfile.topWeakness) {
      profileText += ` Development focus: ${topProfile.topWeakness.name} (${topProfile.topWeakness.score}/100).`;
    }
    if (secondProfile.topStrength) {
      profileText += ` ${secondProfile.name} shows strength in ${secondProfile.topStrength.name} (${secondProfile.topStrength.score}/100).`;
    }
    
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    const splitProfileText = pdf.splitTextToSize(profileText, pageWidth - 48);
    const profileBoxH = 8 + (splitProfileText.length * 3.5);
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(20, yPos, pageWidth - 40, profileBoxH, 2, 2, 'F');
    
    pdf.setTextColor(71, 85, 105);
    pdf.text(splitProfileText, 24, yPos + 5);
    yPos += profileBoxH;
  }
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  
  // --- ROLE SUITABILITY ANALYSIS (only if a role is selected) ---
  // Helper to extract skill requirements from requiredSkillScores structure
  // Database structure: { fitSkills: Record<string, number>, aiReadinessSkills: Record<string, number> }
  const extractSkillRequirementsPDF = (requiredSkillScores: any): Record<string, number> => {
    const skills: Record<string, number> = {};
    if (!requiredSkillScores) return skills;
    
    // Handle database structure with fitSkills and aiReadinessSkills
    if (requiredSkillScores.fitSkills) {
      Object.entries(requiredSkillScores.fitSkills).forEach(([skillName, score]: [string, any]) => {
        if (typeof score === 'number') {
          skills[skillName] = score;
        }
      });
    }
    if (requiredSkillScores.aiReadinessSkills) {
      Object.entries(requiredSkillScores.aiReadinessSkills).forEach(([skillName, score]: [string, any]) => {
        if (typeof score === 'number') {
          skills[skillName] = score;
        }
      });
    }
    
    // Also handle legacy FIT/AI_READINESS structure for backwards compatibility
    if (requiredSkillScores.FIT) {
      Object.entries(requiredSkillScores.FIT).forEach(([skillName, data]: [string, any]) => {
        if (typeof data === 'object' && data.score !== undefined) {
          skills[skillName] = data.score;
        } else if (typeof data === 'number') {
          skills[skillName] = data;
        }
      });
    }
    if (requiredSkillScores.AI_READINESS) {
      Object.entries(requiredSkillScores.AI_READINESS).forEach(([skillName, data]: [string, any]) => {
        if (typeof data === 'object' && data.score !== undefined) {
          skills[skillName] = data.score;
        } else if (typeof data === 'number') {
          skills[skillName] = data;
        }
      });
    }
    
    return skills;
  };
  
  // Get role data from passed roleData (database) or fallback to static ROLE_DEFINITIONS
  const roleData = data.roleData || (data.selectedRole && ROLE_DEFINITIONS[data.selectedRole] ? {
    id: data.selectedRole,
    name: ROLE_DEFINITIONS[data.selectedRole].name,
    description: ROLE_DEFINITIONS[data.selectedRole].description,
  } : null);
  
  // Extract role requirements from database roleData or static ROLE_DEFINITIONS
  const roleWeights: Record<string, number> = data.roleData?.requiredSkillScores 
    ? extractSkillRequirementsPDF(data.roleData.requiredSkillScores)
    : (data.selectedRole && ROLE_DEFINITIONS[data.selectedRole]?.weights || {});
  
  if (roleData) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;
    
    yPos = addSectionHeader(pdf, `ROLE SUITABILITY: ${roleData.name.toUpperCase()}`, yPos, pageWidth);
    yPos += 3;
    
    // Role description
    applySmallText(pdf);
    pdf.setFont('helvetica', 'italic');
    pdf.text(roleData.description || 'Role suitability analysis based on skill requirements', 20, yPos);
    yPos += 5;
  
  // Calculate role suitability with criticality weighting and critical gap penalties
  // Matches server logic: Critical skills 2x, Important 1.5x, Nice-to-have 1x
  // Plus 10% penalty per critical skill below requirement (capped at 50%)
  const calculateRoleSuitabilityPDF = (candidateIndex: number): number => {
    const skills = getAllCandidateSkillsPDF(candidateIndex);
    const skillCriticality = (data.roleData?.requiredSkillScores?.skillCriticality || {}) as Record<string, string>;
    
    const getSkillWeight = (skillName: string): number => {
      const criticality = skillCriticality[skillName] || 'standard';
      if (criticality === 'critical') return 2.0;
      return 1.0;
    };
    
    let weightedTotal = 0;
    let weightSum = 0;
    let criticalGaps = 0;
    let totalCriticalSkills = 0;
    let matchCount = 0;
    
    Object.entries(roleWeights).forEach(([skillName, requiredScore]) => {
      if (requiredScore <= 0) return;
      
      const candidateScore = skills[skillName];
      const weight = getSkillWeight(skillName);
      const isCritical = skillCriticality[skillName] === 'critical';
      
      if (isCritical) totalCriticalSkills++;
      
      if (candidateScore !== undefined) {
        // Calculate match percentage (capped at 100%)
        const matchPercent = Math.min(100, (candidateScore / requiredScore) * 100);
        weightedTotal += matchPercent * weight;
        weightSum += weight;
        matchCount++;
        
        // Track critical gaps
        if (isCritical && candidateScore < requiredScore) {
          criticalGaps++;
        }
      } else {
        // Missing critical skills count as critical gaps
        if (isCritical) {
          criticalGaps++;
        }
      }
    });
    
    const totalRequiredSkills = Object.keys(roleWeights).filter(k => roleWeights[k] > 0).length;
    const coverage = totalRequiredSkills > 0 ? matchCount / totalRequiredSkills : 0;
    
    // Calculate weighted average with coverage penalty
    let score = weightSum > 0 ? (weightedTotal / weightSum) * coverage : 0;
    
    // Apply critical gap penalty: 15% reduction per critical gap (capped at 60%)
    if (criticalGaps > 0 && totalCriticalSkills > 0) {
      const criticalPenalty = criticalGaps * 0.15;
      score = score * (1 - Math.min(criticalPenalty, 0.6));
    }
    
    // Hard cap: if candidate fails more than half their critical skills,
    // overall fit cannot exceed 74% (prevents "Strong Fit" tier for critically deficient candidates)
    if (totalCriticalSkills > 0 && criticalGaps > totalCriticalSkills / 2) {
      score = Math.min(score, 74);
    }
    
    return Math.round(score);
  };
  
  // Draw role fit scores - aligned with other tables
  const roleTableStartX = 20;
  const roleRightMargin = 25;
  const roleAvailableWidth = pageWidth - roleTableStartX - roleRightMargin;
  const roleLabelColWidth = 50;
  const roleCandidateColWidth = Math.max(30, (roleAvailableWidth - roleLabelColWidth) / data.candidates.length);
  const roleColWidths = [roleLabelColWidth, ...Array(data.candidates.length).fill(roleCandidateColWidth)];
  
  // Header - use shorter names to prevent cutoff
  const roleHeaderNames = data.candidates.map(c => {
    const name = getCandidateName(c);
    return name.length > 15 ? name.substring(0, 13) + '...' : name;
  });
  drawTableRow(pdf, roleTableStartX, yPos, roleColWidths,
    ['Role Fit Score', ...roleHeaderNames], 6, {
    isBold: true,
    fontSize: 8,
    fillColor: [249, 250, 251],
    textColor: [17, 24, 39]
  });
  yPos += 6;
  
  // Scores
  const roleFitScores = data.candidates.map((_, index) => calculateRoleSuitabilityPDF(index));
  const maxRoleFit = Math.max(...roleFitScores);
  const minRoleFit = Math.min(...roleFitScores.filter(s => s > 0));
  
  applySmallText(pdf);
  
  let roleXOffset = roleTableStartX;
  pdf.setDrawColor(200, 200, 200);
  pdf.rect(roleXOffset, yPos, roleLabelColWidth, 8, 'S');
  pdf.setTextColor(55, 65, 81);
  pdf.text('Suitability %', roleXOffset + 2, yPos + 5);
  roleXOffset += roleLabelColWidth;
  
  roleFitScores.forEach((score, index) => {
    // Color coding
    if (score === maxRoleFit && roleFitScores.filter(s => s === maxRoleFit).length === 1) {
      pdf.setFillColor(220, 252, 231); // Green bg
      pdf.setTextColor(22, 163, 74);
    } else if (score === minRoleFit && score > 0) {
      pdf.setFillColor(254, 226, 226); // Red bg
      pdf.setTextColor(220, 38, 38);
    } else {
      pdf.setFillColor(254, 249, 195); // Yellow bg
      pdf.setTextColor(161, 98, 7);
    }
    
    pdf.rect(roleXOffset, yPos, roleCandidateColWidth, 8, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(roleXOffset, yPos, roleCandidateColWidth, 8, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${score}%`, roleXOffset + roleCandidateColWidth / 2, yPos + 5, { align: 'center' });
    
    roleXOffset += roleCandidateColWidth;
  });
  yPos += 12; // 8mm for row height + 4mm padding before recommendation box
  
  // Role Suitability Explanation - Enhanced with comprehensive skill prioritization
  const roleScoresSorted = data.candidates
    .map((c, i) => ({ 
      name: getCandidateName(c), 
      score: roleFitScores[i], 
      index: i,
      skills: getAllCandidateSkillsPDF(i)
    }))
    .sort((a, b) => b.score - a.score);
  
  // Skill benefit descriptions - comprehensive mapping
  const skillBenefits: Record<string, string> = {
    'Domain Expertise': 'enables strategic guidance on industry-specific applications and ensures deep subject matter knowledge',
    'Collaboration & Communication': 'facilitates stakeholder alignment, cross-functional coordination, and clear information sharing',
    'High Agency': 'drives proactive problem-solving, independent initiative, and ownership of outcomes',
    'AI Literacy & Prompt Engineering': 'ensures effective AI system implementation and optimal human-AI interaction',
    'Critical Thinking & Problem-Solving': 'supports analytical decision-making and structured approach to complex challenges',
    'Interpersonal Agility': 'enables effective navigation of team dynamics and adaptive relationship building',
    'Responsible AI & Ethical Awareness': 'ensures AI governance compliance, ethical considerations, and responsible technology use',
    'Growth Mindset': 'supports adaptation to emerging technologies, continuous learning, and embracing feedback',
    'Resilience': 'maintains performance under pressure, recovers from setbacks, and sustains motivation',
    'Empathy & Ethics': 'fosters trust-building, ethical decision-making, and consideration of diverse perspectives',
    'Intellectual Curiosity': 'drives proactive exploration, questioning assumptions, and seeking deeper understanding',
    'Data Fluency': 'enables data-driven decision making and interpretation of quantitative insights',
    'Adaptability': 'supports flexibility in changing environments and quick adjustment to new requirements',
    'Leadership': 'guides teams effectively, inspires others, and drives strategic initiatives',
    'Technical Proficiency': 'ensures competent execution of technical tasks and understanding of systems',
  };
  
  // Skill criticality descriptions based on weight
  const getCriticality = (weight: number): { level: string; color: number[] } => {
    if (weight >= 0.2) return { level: 'Critical', color: [220, 38, 38] }; // Red
    if (weight >= 0.15) return { level: 'Important', color: [217, 119, 6] }; // Amber
    return { level: 'Supporting', color: [22, 163, 74] }; // Green
  };
  
  // Sort skills by weight to get properly prioritized list
  const sortedRoleSkills = Object.entries(roleWeights)
    .sort(([, a], [, b]) => (b as number) - (a as number));
  
  const topWeightedSkills = sortedRoleSkills.slice(0, 3).map(([name]) => name);
  
  // Skill Prioritization Box - shows why these skills matter
  yPos = ensurePageSpace(pdf, yPos, 55, pageHeight, pageWidth);
  
  // Build comprehensive explanation for top skills first to calculate box height
  let priorityExplanation = `For the ${roleData.name} role, the weighted scoring model prioritizes: `;
  topWeightedSkills.forEach((skillName, idx) => {
    const weight = roleWeights[skillName] as number;
    const criticality = getCriticality(weight);
    const benefit = skillBenefits[skillName] || 'contributes to role effectiveness';
    
    if (idx === 0) {
      priorityExplanation += `${skillName} (${criticality.level} - ${benefit})`;
    } else if (idx === topWeightedSkills.length - 1) {
      priorityExplanation += `, and ${skillName} (${criticality.level} - ${benefit})`;
    } else {
      priorityExplanation += `, ${skillName} (${criticality.level} - ${benefit})`;
    }
  });
  priorityExplanation += '.';
  
  // Use narrower text width to ensure text stays within box with padding
  const priorityTextWidth = pageWidth - 60;
  const priorityLines = pdf.splitTextToSize(priorityExplanation, priorityTextWidth);
  const priorityBoxHeight = 14 + (priorityLines.length * 5);
  
  pdf.setFillColor(240, 249, 255); // Light blue background
  pdf.roundedRect(20, yPos, pageWidth - 40, priorityBoxHeight, 2, 2, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text('Skill Prioritization Rationale', 24, yPos + 7);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  priorityLines.forEach((line: string, i: number) => {
    pdf.text(line, 24, yPos + 14 + (i * 4.5));
  });
  
  yPos += priorityBoxHeight + 5;
  
  } // End of role suitability conditional
  
  // ========== RECOMMENDED NEXT STEPS & ADDITIONAL SERVICES ==========
  // Both sections on the same page - estimate space needed: ~120mm for both sections
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
  
  // RECOMMENDED NEXT STEPS section
  yPos = addSectionHeader(pdf, 'RECOMMENDED NEXT STEPS', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  // Use passed-in next steps from dashboard if available
  const nextStepsToUse = data.comparisonNextSteps || [
    'Review candidate assessment details to identify the best fit',
    'Consider scheduling follow-up interviews with top performers'
  ];
  
  nextStepsToUse.forEach(step => {
    pdf.setTextColor(37, 99, 235);
    pdf.text('•', 27, yPos);
    pdf.setTextColor(55, 65, 81);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + (idx * 5));
    });
    yPos += (stepLines.length * 5) + 3;
  });
  
  yPos += 10;
  
  // ADDITIONAL SERVICES ON REQUEST section (same page)
  yPos = addSectionHeader(pdf, 'ADDITIONAL SERVICES ON REQUEST', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text('HumanMetrix offers additional analysis services to support your hiring decision:', 20, yPos);
  yPos += 10;
  
  const comparisonAdditionalServices = [
    {
      name: 'Suggested Interview Questions',
      description: 'Customized interview questions based on assessment results and identified skill gaps'
    },
    {
      name: 'Team Composition Fit',
      description: 'Analysis of how the candidate would integrate with your existing team dynamics and structure'
    },
    {
      name: 'Time to Productivity Estimate',
      description: 'Projected timeline for the candidate to reach full productivity in the role'
    },
    {
      name: 'Hiring Risk Analysis',
      description: 'Comprehensive risk assessment including potential challenges and mitigation strategies'
    },
    {
      name: 'Development Investment Cost',
      description: 'Estimated training and development investment required to bridge identified skill gaps'
    }
  ];
  
  comparisonAdditionalServices.forEach((service, index) => {
    yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);
    
    // Service number badge
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPos - 2, 6, 6, 1, 1, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}`, 23, yPos + 2, { align: 'center' });
    
    // Service name
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(service.name, 30, yPos + 2);
    
    // Service description
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const descLines = pdf.splitTextToSize(service.description, pageWidth - 55);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + 8 + (idx * 5));
    });
    
    yPos += 8 + (descLines.length * 5) + 4;
  });
  
  yPos += 6;
  
  // Contact info box
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(59, 130, 246);
  pdf.roundedRect(20, yPos, pageWidth - 40, 16, 2, 2, 'FD');
  
  pdf.setFontSize(10);
  pdf.setTextColor(30, 58, 138);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact the HumanMetrix team to learn more about these services', 25, yPos + 6);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('hello@humanmetrix.co.uk', 25, yPos + 12);
  
  yPos += 22;
  
  // Closing statement / Disclaimer
  yPos = ensurePageSpace(pdf, yPos, 20, pageHeight, pageWidth);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  const closingText = 'This recommendation is generated based solely on assessment data and should be considered alongside interviews, references, and other evaluation criteria for comprehensive hiring decisions.';
  const closingLines = pdf.splitTextToSize(closingText, pageWidth - 50);
  closingLines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 5;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Add Skills Legend page at the end
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  savePdfMobile(pdf, `comparison-report-${timestamp}.pdf`);
}

export async function exportRoleFitPDF(data: RoleFitData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  const candidateName = data.candidate.user.firstName || data.candidate.user.lastName
    ? `${data.candidate.user.firstName || ''} ${data.candidate.user.lastName || ''}`.trim()
    : 'Candidate';
  
  // ========== PAGE 1: HOW TO READ OUR REPORTS GUIDE ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'rolefit');
  
  // ========== PAGE 2: COVER + OVERALL FIT SCORE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section with blue background (compact)
  yPos = 40;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ROLE FIT ANALYSIS', pageWidth / 2, yPos + 13, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 25, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Three-card layout: Candidate | Target Role | Overall Fit Score (inline)
  yPos = 85;
  const cardGap = 5;
  const cardWidth = (pageWidth - 40 - cardGap * 2) / 3;
  const baseCardHeight = 45; // Increased to accommodate wrapped text
  
  // Pre-calculate role description lines to determine dynamic height
  let descLines: string[] = [];
  let finalCardHeight = baseCardHeight;
  if (data.role.description) {
    pdf.setFontSize(7);
    descLines = pdf.splitTextToSize(data.role.description, cardWidth - 10);
    const maxDescLines = Math.min(descLines.length, 3);
    finalCardHeight = Math.max(baseCardHeight, 38 + (maxDescLines * 3)); // Increased base for wrapped names
  }
  
  // Card 1: Candidate (left) - uses finalCardHeight
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, cardWidth, finalCardHeight, 2, 2, 'FD');
  
  applyLabelText(pdf);
  pdf.text('CANDIDATE', 25, yPos + 8);
  
  applySubheading(pdf);
  pdf.setTextColor(17, 24, 39);
  // Allow name to wrap to two lines if needed
  const nameLines = pdf.splitTextToSize(candidateName, cardWidth - 10);
  const displayNameLines = nameLines.slice(0, 2); // Max 2 lines
  displayNameLines.forEach((line: string, idx: number) => {
    pdf.text(line, 25, yPos + 17 + (idx * 5));
  });
  const nameEndY = yPos + 17 + (displayNameLines.length * 5);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  // Allow email to wrap to two lines if needed
  const emailLines = pdf.splitTextToSize(data.candidate.user.email, cardWidth - 10);
  const displayEmailLines = emailLines.slice(0, 2); // Max 2 lines
  displayEmailLines.forEach((line: string, idx: number) => {
    pdf.text(line, 25, nameEndY + 2 + (idx * 3));
  });
  
  // Card 2: Target Role (middle) - uses finalCardHeight
  const roleX = 20 + cardWidth + cardGap;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(roleX, yPos, cardWidth, finalCardHeight, 2, 2, 'FD');
  
  applyLabelText(pdf);
  pdf.text('TARGET ROLE', roleX + 5, yPos + 8);
  
  applySubheading(pdf);
  pdf.setTextColor(17, 24, 39);
  // Allow role name to wrap to two lines if needed
  const roleNameLines = pdf.splitTextToSize(data.role.name, cardWidth - 10);
  const displayRoleNameLines = roleNameLines.slice(0, 2); // Max 2 lines
  displayRoleNameLines.forEach((line: string, idx: number) => {
    pdf.text(line, roleX + 5, yPos + 17 + (idx * 5));
  });
  const roleNameEndY = yPos + 17 + (displayRoleNameLines.length * 5);
  
  if (data.role.description && descLines.length > 0) {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const displayLines = descLines.slice(0, 3);
    displayLines.forEach((line: string, idx: number) => {
      pdf.text(line, roleX + 5, roleNameEndY + 2 + (idx * 3));
    });
  }
  
  // Card 3: Overall Fit Score (right) - uses finalCardHeight
  const overallFitScore = data.alignment.overallFit ?? 0;
  const fitColor = overallFitScore >= 80 ? [34, 197, 94] : 
                   overallFitScore >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = overallFitScore >= 80 ? 'Excellent Fit' : 
                   overallFitScore >= 60 ? 'Good Fit' : 'Needs Development';
  
  const fitX = roleX + cardWidth + cardGap;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(fitX, yPos, cardWidth, finalCardHeight, 2, 2, 'FD');
  pdf.setLineWidth(0.5);
  
  applyLabelText(pdf);
  pdf.text('OVERALL FIT', fitX + 5, yPos + 8);
  
  // Large score
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${overallFitScore}%`, fitX + 5, yPos + 22);
  
  // Fit label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(fitLabel, fitX + 5, yPos + 30);
  
  pdf.setTextColor(0, 0, 0);
  yPos = 85 + finalCardHeight + 8;
  
  // Calculate how much space the strengths and gaps sections need
  const estimatedStrengthsHeight = Math.ceil(data.alignment.strengths.length / 2) * 16 + 12;
  const estimatedGapsHeight = Math.ceil(data.alignment.gaps.length / 2) * 16 + 12;
  const totalNeededHeight = estimatedStrengthsHeight + estimatedGapsHeight + 20;
  
  // Check if both sections will fit on current page, if not start new page
  if (yPos + totalNeededHeight > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;
  } else {
    yPos += 5;
  }
  
  // ========== KEY STRENGTHS (text descriptions) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  const rfStrengthsDescText = 'Areas where the candidate exceeds role requirements and demonstrates strong capability';
  applySmallText(pdf);
  const rfStrengthsDescLines = pdf.splitTextToSize(rfStrengthsDescText, pageWidth - 48);
  const rfStrengthsDescBoxH = Math.max(10, rfStrengthsDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfStrengthsDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(rfStrengthsDescLines, 24, yPos + 4);
  yPos += rfStrengthsDescBoxH + 3;
  
  // Use text descriptions from alignment.strengths
  const strengthDescriptions = data.alignment.strengths?.slice(0, 6) || [];
  
  // Three-column compact grid of name-only boxes
  const compactCols = 3;
  const compactBoxGap = 4;
  const compactBoxWidth = (pageWidth - 40 - (compactCols - 1) * compactBoxGap) / compactCols;
  const compactBoxHeight = 9;
  
  let currentStrengthY = yPos;
  strengthDescriptions.forEach((strength: string | { skill: string; summary: string; description: string }, index: number) => {
    const isObject = typeof strength === 'object' && strength !== null;
    const skillName = isObject ? (strength.skill || strength.summary) : String(strength);
    
    const col = index % compactCols;
    if (col === 0 && index > 0) {
      currentStrengthY += compactBoxHeight + 3;
    }
    
    if (col === 0 && currentStrengthY + compactBoxHeight > pageHeight - 20) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      currentStrengthY = 35;
    }
    
    const boxX = 20 + col * (compactBoxWidth + compactBoxGap);
    
    pdf.setFillColor(250, 255, 250);
    pdf.setDrawColor(134, 197, 134);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, currentStrengthY, compactBoxWidth, compactBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 84, 52);
    pdf.text(skillName, boxX + 3, currentStrengthY + 5.5);
  });
  
  yPos = currentStrengthY + compactBoxHeight + 3;
  pdf.setTextColor(0, 0, 0);
  
  // ========== DEVELOPMENT AREAS (text descriptions) ==========
  // Use text descriptions from alignment.gaps
  const gapDescriptions = data.alignment.gaps?.slice(0, 6) || [];
  
  // Check if DEVELOPMENT AREAS section needs a new page before rendering header
  if (yPos + 30 > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;
  }
  
  yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS', yPos, pageWidth);
  yPos += 2;
  
  const rfDevDescText = 'Skill gaps requiring targeted development to meet role requirements';
  applySmallText(pdf);
  const rfDevDescLines = pdf.splitTextToSize(rfDevDescText, pageWidth - 48);
  const rfDevDescBoxH = Math.max(10, rfDevDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfDevDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(rfDevDescLines, 24, yPos + 4);
  yPos += rfDevDescBoxH + 3;
  
  const devCompactCols = 3;
  const devCompactBoxGap = 4;
  const devCompactBoxWidth = (pageWidth - 40 - (devCompactCols - 1) * devCompactBoxGap) / devCompactCols;
  const devCompactBoxHeight = 9;
  
  let currentGapY = yPos;
  gapDescriptions.forEach((gap: string | { skill: string; summary: string; description: string }, index: number) => {
    const isObject = typeof gap === 'object' && gap !== null;
    const skillName = isObject ? (gap.skill || gap.summary) : String(gap);
    
    const col = index % devCompactCols;
    if (col === 0 && index > 0) {
      currentGapY += devCompactBoxHeight + 3;
    }
    
    if (col === 0 && currentGapY + devCompactBoxHeight > pageHeight - 20) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      currentGapY = 35;
    }
    
    const boxX = 20 + col * (devCompactBoxWidth + devCompactBoxGap);
    
    pdf.setFillColor(255, 253, 245);
    pdf.setDrawColor(210, 180, 100);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, currentGapY, devCompactBoxWidth, devCompactBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(130, 90, 20);
    pdf.text(skillName, boxX + 3, currentGapY + 5.5);
  });
  
  yPos = currentGapY + devCompactBoxHeight + 3;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILL ALIGNMENT ANALYSIS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 32;
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 2;
  
  const rfAlignDescText = 'Detailed comparison of candidate skills against role requirements from FIT and AI Readiness assessments';
  applySmallText(pdf);
  const rfAlignDescLines = pdf.splitTextToSize(rfAlignDescText, pageWidth - 48);
  const rfAlignDescBoxH = Math.max(10, rfAlignDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfAlignDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(rfAlignDescLines, 24, yPos + 4);
  yPos += rfAlignDescBoxH + 3;
  
  const pdfAllAlignmentSkills = [
    ...(data.alignment.fitSkillAlignments || []),
    ...(data.alignment.aiReadinessSkillAlignments || [])
  ];
  const pdfTop6CriticalNames = data.criticalSkillNames
    ? new Set(data.criticalSkillNames)
    : new Set(
        pdfAllAlignmentSkills
          .filter(s => s.criticality === 'critical')
          .sort((a, b) => (b.requiredScore ?? 0) - (a.requiredScore ?? 0))
          .slice(0, 6)
          .map(s => s.skillName)
      );
  const pdfCriticalSkillsList = pdfAllAlignmentSkills
    .filter(s => pdfTop6CriticalNames.has(s.skillName))
    .sort((a, b) => (b.requiredScore ?? 0) - (a.requiredScore ?? 0));

  const renderSkillSection = (skills: any[], sectionTitle: string, iconColor: [number, number, number]) => {
    if (!skills || skills.length === 0) return;
    
    // Section title with icon
    applySubheading(pdf);
    pdf.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
    pdf.text(sectionTitle, 20, yPos);
    yPos += 7;
    
    // Line chart dimensions - wide left margin for full skill labels
    const chartMarginLeft = 75;
    const chartWidth = pageWidth - 95;
    const chartHeight = skills.length * 8;
    const chartStartY = yPos;
    
    // Draw chart background with subtle border
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.5);
    pdf.rect(chartMarginLeft, chartStartY, chartWidth, chartHeight, 'FD');
    
    // Draw Y-axis (skills)
    pdf.setDrawColor(203, 213, 225);
    pdf.setLineWidth(1);
    pdf.line(chartMarginLeft, chartStartY, chartMarginLeft, chartStartY + chartHeight);
    
    // Draw X-axis (scores 0-100)
    pdf.setLineWidth(1);
    pdf.line(chartMarginLeft, chartStartY + chartHeight, chartMarginLeft + chartWidth, chartStartY + chartHeight);
    
    // X-axis labels (0, 25, 50, 75, 100)
    applySmallText(pdf);
    [0, 25, 50, 75, 100].forEach(val => {
      const x = chartMarginLeft + (val / 100) * chartWidth;
      pdf.text(`${val}`, x, chartStartY + chartHeight + 4, { align: 'center' });
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      if (val > 0) { // Don't draw gridline at 0 (that's the Y-axis)
        pdf.line(x, chartStartY, x, chartStartY + chartHeight);
      }
    });
    
    // Plot each skill as a horizontal line segment
    const skillHeight = chartHeight / skills.length;
    
    skills.forEach((skill, index) => {
      const skillY = chartStartY + (index * skillHeight) + (skillHeight / 2);
      
      const isCritical = pdfTop6CriticalNames.has(skill.skillName);
      const skillName = skill.skillName;
      
      if (isCritical) {
        // Blue badge for critical skills - positioned prominently
        pdf.setFillColor(37, 99, 235); // Blue-600
        pdf.roundedRect(14, skillY - 2.2, 10, 4.5, 1, 1, 'F');
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(255, 255, 255);
        pdf.text('CRITICAL', 19, skillY + 0.8, { align: 'center' });
        
        // Skill name in bold blue for critical skills
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(30, 64, 175); // Blue-800
        pdf.setFontSize(8);
        pdf.text(skillName, chartMarginLeft - 3, skillY + 1, { align: 'right' });
      } else {
        // No badge for non-critical skills - just show skill name
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(8);
        pdf.text(skillName, chartMarginLeft - 3, skillY + 1, { align: 'right' });
      }
      
      pdf.setFont('helvetica', 'normal');
      
      // Calculate positions
      const requiredX = chartMarginLeft + (skill.requiredScore / 100) * chartWidth;
      const candidateX = chartMarginLeft + (skill.candidateScore / 100) * chartWidth;
      
      // Draw line connecting required to candidate score
      const lineColor = skill.candidateScore >= skill.requiredScore ? [34, 197, 94] : [239, 68, 68];
      pdf.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      pdf.setLineWidth(0.8); // Consistent line thickness for all skills
      pdf.line(Math.min(requiredX, candidateX), skillY, Math.max(requiredX, candidateX), skillY);
      
      // Draw required score marker (hollow circle)
      pdf.setFillColor(255, 255, 255); // White fill
      pdf.circle(requiredX, skillY, 1.5, 'F');
      pdf.setDrawColor(107, 114, 128);
      pdf.setLineWidth(1);
      pdf.circle(requiredX, skillY, 1.5, 'D');
      
      // Draw candidate score marker (filled circle)
      pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
      pdf.circle(candidateX, skillY, 1.5, 'F');
      
      // Add score labels
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${skill.requiredScore}`, requiredX, skillY - 2.5, { align: 'center' });
      pdf.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${skill.candidateScore}`, candidateX, skillY + 4, { align: 'center' });
      pdf.setFont('helvetica', 'normal');
      
      pdf.setLineWidth(0.2);
    });
    
    // Legend
    yPos = chartStartY + chartHeight + 8;
    applySmallText(pdf);
    
    // Required score legend (hollow circle)
    pdf.setFillColor(255, 255, 255);
    pdf.circle(chartMarginLeft + 5, yPos, 1.5, 'F');
    pdf.setDrawColor(107, 114, 128);
    pdf.setLineWidth(1);
    pdf.circle(chartMarginLeft + 5, yPos, 1.5, 'D');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Required Score', chartMarginLeft + 11, yPos + 1);
    
    // Candidate score legend (filled circle)
    pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
    const legendX = chartMarginLeft + 40;
    pdf.circle(legendX, yPos, 1.5, 'F');
    pdf.text('Candidate Score', legendX + 6, yPos + 1);
    
    // Criticality legend - inline with other legend items (blue theme)
    const criticalLegendX = legendX + 38;
    pdf.setFillColor(37, 99, 235); // Blue-600
    pdf.roundedRect(criticalLegendX, yPos - 1.5, 10, 4, 1, 1, 'F');
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('CRITICAL', criticalLegendX + 5, yPos + 1, { align: 'center' });
    applySmallText(pdf);
    pdf.setTextColor(55, 65, 81);
    pdf.text('= Essential for role success', criticalLegendX + 14, yPos + 1);
    
    pdf.setFont('helvetica', 'normal');
    yPos += 6;
  };
  
  // Render FIT skills if available
  if (data.alignment.fitSkillAlignments && data.alignment.fitSkillAlignments.length > 0) {
    renderSkillSection(data.alignment.fitSkillAlignments, 'FIT ASSESSMENT SKILLS (Behavioral)', [59, 130, 246]);
  }
  
  // Render AI Readiness skills on same page (use ensurePageSpace as fallback)
  if (data.alignment.aiReadinessSkillAlignments && data.alignment.aiReadinessSkillAlignments.length > 0) {
    yPos += 4;
    const aiChartHeight = data.alignment.aiReadinessSkillAlignments.length * 8 + 25;
    yPos = ensurePageSpace(pdf, yPos, aiChartHeight, pageHeight, pageWidth);
    renderSkillSection(data.alignment.aiReadinessSkillAlignments, 'AI READINESS SKILLS (Technical)', [59, 130, 246]);
  }
  
  // ========== CRITICAL SKILLS ANALYSIS (new page) ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
  const criticalSkills = pdfCriticalSkillsList;
  
  if (criticalSkills.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    const rfCritDescText = 'Deep analysis of the most critical skills required for this role';
    applySmallText(pdf);
    const rfCritDescLines = pdf.splitTextToSize(rfCritDescText, pageWidth - 48);
    const rfCritDescBoxH = Math.max(10, rfCritDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfCritDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(rfCritDescLines, 24, yPos + 4);
    yPos += rfCritDescBoxH + 3;
    
    // Critical skills explanations - specific to each skill
    const criticalSkillExplanations: Record<string, string> = {
      // FIT Assessment Skills
      'High Agency': 'Enables proactive problem-solving and ownership of outcomes, reducing dependency on constant supervision in fast-moving AI environments.',
      'Intellectual Curiosity': 'Drives continuous exploration of new AI capabilities and applications, essential for identifying innovative use cases.',
      'Resilience': 'Critical for navigating the rapid iteration cycles and frequent setbacks inherent in AI implementation projects.',
      'Empathy & Ethics': 'Ensures AI solutions consider human impact and ethical implications, vital for responsible AI deployment.',
      'Growth Mindset': 'Enables adaptation to the rapidly evolving AI landscape and openness to learning new tools and methodologies.',
      'Interpersonal Agility': 'Essential for effective collaboration across diverse teams and stakeholders in complex AI initiatives.',
      // AI Readiness Skills
      'AI Literacy & Prompt Engineering': 'Core competency for effectively leveraging AI tools and crafting prompts that yield optimal results.',
      'Technical Fundamentals': 'Provides the foundation for understanding AI system architecture and integration requirements.',
      'Data Fluency': 'Essential for interpreting AI outputs, validating data quality, and making data-driven decisions.',
      'Critical Thinking & Problem-Solving': 'Key for evaluating AI recommendations and identifying optimal solutions to complex challenges.',
      'Adaptability & Continuous Learning': 'Vital for staying current with rapidly evolving AI technologies and methodologies.',
      'Human-AI Collaboration': 'Critical for optimizing workflows that effectively combine human judgment with AI capabilities.',
      'Responsible AI & Ethical Awareness': 'Ensures AI implementations align with ethical standards, regulations, and organizational values.',
      'Domain Expertise': 'Enables effective application of AI solutions to specific business contexts and industry requirements.',
      'Creativity & Innovation': 'Key for discovering novel AI applications and designing innovative solutions to business challenges.',
      // Legacy mappings
      'Collaboration & Communication': 'Vital for bridging technical and non-technical teams in AI initiatives and ensuring alignment.',
      'Data Fluency & Interpretation': 'Essential for understanding AI inputs and outputs to make informed decisions.',
      'Continuous Learning Orientation': 'Vital for staying current with rapidly evolving AI landscape and emerging best practices.',
      'Default': 'This skill directly impacts performance quality and team effectiveness in AI-integrated workflows.'
    };
    
    // Table for critical skills
    criticalSkills.forEach((skill, index) => {
      const prevYPos = yPos;
      yPos = ensurePageSpace(pdf, yPos, 25, pageHeight, pageWidth);
      
      // If page break occurred, re-render section context
      if (yPos < prevYPos) {
        applySmallText(pdf);
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'italic');
        pdf.text('Critical Skills Analysis (continued)', 20, yPos);
        pdf.setFont('helvetica', 'normal');
        yPos += 6;
      }
      
      // Skill name with blue badge
      pdf.setFillColor(37, 99, 235); // Blue-600
      pdf.roundedRect(20, yPos - 2, 10, 4, 0.5, 0.5, 'F');
      pdf.setFontSize(5);
      pdf.setTextColor(255, 255, 255);
      pdf.text('CRITICAL', 25, yPos + 0.5, { align: 'center' });
      
      applySubheading(pdf);
      pdf.setTextColor(17, 24, 39);
      pdf.text(skill.skillName, 33, yPos + 1);
      yPos += 6;
      
      // Why it matters
      applySmallText(pdf);
      pdf.setTextColor(107, 114, 128);
      pdf.setFont('helvetica', 'italic');
      const explanation = criticalSkillExplanations[skill.skillName] || criticalSkillExplanations['Default'];
      const expLines = pdf.splitTextToSize(`Why it matters: ${explanation}`, pageWidth - 50);
      expLines.forEach((line: string) => {
        pdf.text(line, 25, yPos);
        yPos += 3.5;
      });
      pdf.setFont('helvetica', 'normal');
      yPos += 2;
      
      // Check if assessment was completed (dataAvailable flag or null score indicates not completed)
      const skillWithData = skill as { dataAvailable?: boolean; candidateScore: number | null; requiredScore: number; skillName: string };
      const isNotCompleted = skillWithData.dataAvailable === false || skillWithData.candidateScore == null;
      
      applyBodyText(pdf);
      pdf.setTextColor(55, 65, 81);
      
      if (isNotCompleted) {
        // Show "Assessment not completed" instead of misleading gap
        pdf.text(`Candidate Score: `, 25, yPos);
        pdf.setTextColor(217, 119, 6); // Amber-600
        pdf.setFont('helvetica', 'italic');
        pdf.text(`No data`, 60, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(` (Recommended: ${skill.requiredScore})`, 75, yPos);
        pdf.setTextColor(217, 119, 6); // Amber-600
        pdf.text(` Assessment not completed`, 115, yPos);
      } else {
        // Score comparison with gap
        const candidateScoreVal = skill.candidateScore ?? 0;
        const gap = candidateScoreVal - skill.requiredScore;
        const gapColor: [number, number, number] = gap >= 0 ? [34, 197, 94] : [239, 68, 68];
        const gapText = gap >= 0 ? `+${gap} above requirement` : `${Math.abs(gap)} below requirement`;
        
        pdf.text(`Candidate Score: `, 25, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${candidateScoreVal}/100`, 60, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(` (Recommended: ${skill.requiredScore})`, 75, yPos);
        
        pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
        pdf.text(` ${gapText}`, 115, yPos);
      }
      
      yPos += 8;
    });
    
    yPos += 4;
  }
  
  // ========== COHORT BENCHMARKING ==========
  const hasCohortData = data.alignment.cohortBenchmarks && (
    data.alignment.cohortBenchmarks.fit || 
    data.alignment.cohortBenchmarks.ai_readiness || 
    data.alignment.cohortBenchmarks.prompt_architecture || 
    data.alignment.cohortBenchmarks.aiq
  );
  
  if (hasCohortData) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'HUMANMETRIX DATABASE BENCHMARKING', yPos, pageWidth);
    yPos += 6;
    
    const cohort = data.alignment.cohortBenchmarks!;
    
    // Overall summary box
    if (cohort.overall) {
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'FD');
      
      applySubheading(pdf);
      pdf.setTextColor(17, 24, 39);
      pdf.text('Overall Cohort Position', 25, yPos + 6);
      
      // Overall percentile badge
      const overallColor: [number, number, number] = cohort.overall.percentile >= 75 ? [34, 197, 94] : 
        cohort.overall.percentile >= 50 ? [59, 130, 246] : [245, 158, 11];
      pdf.setFillColor(overallColor[0], overallColor[1], overallColor[2]);
      pdf.roundedRect(85, yPos + 2, 22, 6, 1, 1, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cohort.overall.position, 96, yPos + 6, { align: 'center' });
      
      applySmallText(pdf);
      pdf.setTextColor(107, 114, 128);
      pdf.text('Based on comparison with other candidates in the cohort', 25, yPos + 13);
      
      yPos += 25;
    }
    
    // Assessment breakdown table
    const assessmentTypes: Array<{ name: string; skills: string; avgPerc: number }> = [];
    
    if (cohort.fit) {
      assessmentTypes.push({ 
        name: 'FIT Assessment (Behavioral)', 
        skills: `${cohort.fit.skillCount} skills`, 
        avgPerc: cohort.fit.percentile 
      });
    }
    if (cohort.ai_readiness) {
      assessmentTypes.push({ 
        name: 'AI Readiness Assessment', 
        skills: `${cohort.ai_readiness.skillCount} skills`, 
        avgPerc: cohort.ai_readiness.percentile 
      });
    }
    if (cohort.prompt_architecture) {
      assessmentTypes.push({ 
        name: 'Prompt Architecture', 
        skills: '1 composite score', 
        avgPerc: cohort.prompt_architecture.percentile 
      });
    }
    if (cohort.aiq) {
      assessmentTypes.push({ 
        name: 'Artificial Intelligence Quotient (AIQ)', 
        skills: '1 composite score', 
        avgPerc: cohort.aiq.percentile 
      });
    }
    
    if (assessmentTypes.length > 0) {
      // Table header
      pdf.setFillColor(243, 244, 246);
      pdf.rect(20, yPos, pageWidth - 40, 7, 'F');
      applySmallText(pdf);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text('Assessment Type', 25, yPos + 5);
      pdf.text('Skills Compared', 95, yPos + 5);
      pdf.text('Avg Percentile', 135, yPos + 5);
      pdf.text('Position', 170, yPos + 5);
      yPos += 7;
      
      assessmentTypes.forEach((assessment, index) => {
        yPos = ensurePageSpace(pdf, yPos, 8, pageHeight, pageWidth);
        
        // Alternating row colors
        if (index % 2 === 0) {
          pdf.setFillColor(255, 255, 255);
        } else {
          pdf.setFillColor(249, 250, 251);
        }
        pdf.rect(20, yPos, pageWidth - 40, 7, 'F');
        
        applySmallText(pdf);
        pdf.setTextColor(17, 24, 39);
        pdf.text(assessment.name, 25, yPos + 5);
        
        pdf.setTextColor(107, 114, 128);
        pdf.text(assessment.skills, 95, yPos + 5);
        
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${assessment.avgPerc}th`, 140, yPos + 5);
        
        // Position badge
        const posColor: [number, number, number] = assessment.avgPerc >= 50 ? [34, 197, 94] : [245, 158, 11];
        const posLabel = assessment.avgPerc >= 50 ? 'Above Avg' : 'Below Avg';
        pdf.setFillColor(posColor[0], posColor[1], posColor[2]);
        pdf.roundedRect(165, yPos + 1, 18, 5, 1, 1, 'F');
        pdf.setFontSize(5.5);
        pdf.setTextColor(255, 255, 255);
        pdf.text(posLabel, 174, yPos + 4.5, { align: 'center' });
        
        yPos += 7;
      });
      
      yPos += 5;
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== ROLE FLEXIBILITY ANALYSIS (moved before Final Recommendation) ==========
  if (data.alignment.roleFlexibility && data.alignment.roleFlexibility.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'ROLE FLEXIBILITY ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    const rfFlexDescText = 'Alternative roles this candidate might be suitable for (requires 50%+ skill coverage)';
    applySmallText(pdf);
    const rfFlexDescLines = pdf.splitTextToSize(rfFlexDescText, pageWidth - 48);
    const rfFlexDescBoxH = Math.max(10, rfFlexDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfFlexDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(rfFlexDescLines, 24, yPos + 4);
    yPos += rfFlexDescBoxH + 3;
    
    data.alignment.roleFlexibility.forEach((role) => {
      yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);
      
      // Role name
      applyBodyText(pdf);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      pdf.text(role.roleName, 25, yPos);
      
      // Progress bar positioned to the right
      const barX = 130;
      const barWidth = 40;
      const barHeight = 4;
      
      pdf.setFillColor(229, 231, 235);
      pdf.rect(barX, yPos - 3, barWidth, barHeight, 'F');
      
      const fillColor: [number, number, number] = role.fitScore >= 70 ? [34, 197, 94] : role.fitScore >= 50 ? [59, 130, 246] : [234, 179, 8];
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.rect(barX, yPos - 3, (role.fitScore / 100) * barWidth, barHeight, 'F');
      
      // Score badge
      applyBodyText(pdf);
      pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${role.fitScore}%`, barX + barWidth + 3, yPos);
      
      yPos += 5;
      
      // Missing critical skills warning
      if (role.missingCriticalSkills && role.missingCriticalSkills.length > 0) {
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(234, 179, 8); // Amber warning color
        const warningText = `Missing critical skills: ${role.missingCriticalSkills.join(', ')}`;
        pdf.text(warningText, 28, yPos);
        yPos += 4;
      }
      
      yPos += 4;
    });
    
    yPos += PDF_SPACING.medium;
  }
  
  // ========== PROMPT ENGINEERING ROLE FIT ANALYSIS ==========
  if (data.alignment.promptRoleFitAnalysis) {
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    yPos += PDF_SPACING.large;
    
    yPos = addSectionHeader(pdf, 'PROMPT ENGINEERING ROLE FIT ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    const rfPromptDescText = 'AI-generated insights on candidate\'s prompt engineering capabilities for the target role';
    applySmallText(pdf);
    const rfPromptDescLines = pdf.splitTextToSize(rfPromptDescText, pageWidth - 48);
    const rfPromptDescBoxH = Math.max(10, rfPromptDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfPromptDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(rfPromptDescLines, 24, yPos + 4);
    yPos += rfPromptDescBoxH + 3;
    
    // Split analysis into paragraphs
    const promptAnalysisParagraphs = data.alignment.promptRoleFitAnalysis.split(/\n\n+/).filter(p => p.trim());
    
    promptAnalysisParagraphs.forEach((paragraph) => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      
      const paragraphLines = pdf.splitTextToSize(paragraph.trim(), pageWidth - 50);
      paragraphLines.forEach((line: string, idx: number) => {
        yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
        pdf.text(line, 25, yPos + (idx * 4));
      });
      yPos += (paragraphLines.length * 4) + 4;
    });
    
    yPos += PDF_SPACING.medium;
  }
  
  // ========== AIQ (ETHICAL AI) ROLE FIT ANALYSIS ==========
  if (data.alignment.aiqRoleFitAnalysis) {
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    yPos += PDF_SPACING.large;
    
    yPos = addSectionHeader(pdf, 'AIQ (ETHICAL AI) ROLE FIT ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    const rfAiqDescText = 'AI-generated insights on candidate\'s ethical AI judgment for the target role';
    applySmallText(pdf);
    const rfAiqDescLines = pdf.splitTextToSize(rfAiqDescText, pageWidth - 48);
    const rfAiqDescBoxH = Math.max(10, rfAiqDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfAiqDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(rfAiqDescLines, 24, yPos + 4);
    yPos += rfAiqDescBoxH + 3;
    
    // Split analysis into paragraphs
    const aiqAnalysisParagraphs = data.alignment.aiqRoleFitAnalysis.split(/\n\n+/).filter(p => p.trim());
    
    aiqAnalysisParagraphs.forEach((paragraph) => {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      
      const paragraphLines = pdf.splitTextToSize(paragraph.trim(), pageWidth - 50);
      paragraphLines.forEach((line: string, idx: number) => {
        yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
        pdf.text(line, 25, yPos + (idx * 4));
      });
      yPos += (paragraphLines.length * 4) + 4;
    });
    
    yPos += PDF_SPACING.medium;
  }
  
  // ========== FINAL RECOMMENDATION ==========
  yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
  yPos += PDF_SPACING.large;
  
  yPos = addSectionHeader(pdf, 'FINAL RECOMMENDATION', yPos, pageWidth);
  yPos += 2;
  
  const rfFinalDescText = 'AI-generated hiring guidance based on comprehensive assessment analysis';
  applySmallText(pdf);
  const rfFinalDescLines = pdf.splitTextToSize(rfFinalDescText, pageWidth - 48);
  const rfFinalDescBoxH = Math.max(10, rfFinalDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, rfFinalDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(rfFinalDescLines, 24, yPos + 4);
  yPos += rfFinalDescBoxH + 3;
  
  // Use passed-in recommendation text from dashboard (ensures consistency)
  const overallFit = data.alignment.overallFit;
  
  // Use recommendation from data if available, otherwise generate fallback
  let recommendationText = data.alignment.finalRecommendation || 
    `${candidateName} has an overall fit score of ${overallFit}/100 for the ${data.role.name} position.`;
  
  // Strip out sections that appear separately or are redundant
  recommendationText = recommendationText
    .replace(/OVERALL ASSESSMENT:.*?\n/gi, '') // Remove OVERALL ASSESSMENT line
    .replace(/KEY STRENGTHS:[\s\S]*?(?=\n\n[A-Z]|DEVELOPMENT AREAS:|COHORT CONTEXT:|HIRING RECOMMENDATION:|ALTERNATIVE ROLE|$)/gi, '')
    .replace(/DEVELOPMENT AREAS:[\s\S]*?(?=\n\n[A-Z]|COHORT CONTEXT:|HIRING RECOMMENDATION:|ALTERNATIVE ROLE|$)/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  
  // Convert section titles from ALL CAPS to Title Case
  recommendationText = recommendationText
    .replace(/CRITICAL SKILLS ANALYSIS:/g, 'Critical Skills Analysis:')
    .replace(/COHORT CONTEXT:/g, 'Cohort Context:')
    .replace(/HIRING RECOMMENDATION:/g, 'Hiring Recommendation:')
    .replace(/ALTERNATIVE ROLE INSIGHT:/g, 'Alternative Role Insight:');
  
  // Split recommendation into paragraphs (sections separated by double newlines)
  const recommendationParagraphs = recommendationText.split(/\n\n+/).filter(p => p.trim());
  
  recommendationParagraphs.forEach((paragraph) => {
    // Reduced font size for Final Recommendation content
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const paragraphLines = pdf.splitTextToSize(paragraph.trim(), pageWidth - 50);
    paragraphLines.forEach((line: string, idx: number) => {
      yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
      pdf.text(line, 25, yPos + (idx * 4));
    });
    yPos += (paragraphLines.length * 4) + 4; // Consistent spacing between paragraphs
  });
  
  yPos += PDF_SPACING.medium;
  
  // ========== RECOMMENDED NEXT STEPS & ADDITIONAL SERVICES ==========
  // Start new page for these sections together
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
  
  // Recommended Next Steps section
  yPos = addSectionHeader(pdf, 'RECOMMENDED NEXT STEPS', yPos, pageWidth);
  yPos += PDF_SPACING.small;
  
  // Next steps bullet content
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  const nextSteps = data.alignment.nextSteps || [
    'Review the detailed skill analysis in this report',
    'Consider scheduling follow-up interviews'
  ];
  
  nextSteps.forEach(step => {
    yPos = ensurePageSpace(pdf, yPos, 12, pageHeight, pageWidth);
    pdf.setTextColor(37, 99, 235);
    pdf.text('•', 27, yPos);
    pdf.setTextColor(55, 65, 81);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + (idx * 5));
    });
    yPos += (stepLines.length * 5) + 3;
  });
  
  yPos += PDF_SPACING.large;
  
  // Additional Services section on same page
  yPos = addSectionHeader(pdf, 'ADDITIONAL SERVICES ON REQUEST', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('HumanMetrix offers additional analysis services to support your hiring decision:', 20, yPos);
  yPos += 8;
  
  const additionalServices = [
    {
      name: 'Suggested Interview Questions',
      description: 'Customized interview questions based on assessment results and identified skill gaps'
    },
    {
      name: 'Team Composition Fit',
      description: 'Analysis of how the candidate would integrate with your existing team dynamics and structure'
    },
    {
      name: 'Time to Productivity Estimate',
      description: 'Projected timeline for the candidate to reach full productivity in the role'
    },
    {
      name: 'Hiring Risk Analysis',
      description: 'Comprehensive risk assessment including potential challenges and mitigation strategies'
    },
    {
      name: 'Development Investment Cost',
      description: 'Estimated training and development investment required to bridge identified skill gaps'
    }
  ];
  
  additionalServices.forEach((service, index) => {
    yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
    
    // Service number badge
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPos - 2, 5, 5, 1, 1, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}`, 22.5, yPos + 1.5, { align: 'center' });
    
    // Service name
    applyBodyText(pdf);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(service.name, 28, yPos + 1);
    
    // Service description
    applySmallText(pdf);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const descLines = pdf.splitTextToSize(service.description, pageWidth - 55);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, 28, yPos + 5 + (idx * 3));
    });
    
    yPos += 5 + (descLines.length * 3) + 3;
  });
  
  yPos += 5;
  
  // Contact info box
  pdf.setFillColor(239, 246, 255); // Light blue
  pdf.setDrawColor(59, 130, 246);
  pdf.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'FD');
  
  applyBodyText(pdf);
  pdf.setTextColor(30, 58, 138);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact the HumanMetrix team to learn more about these services', 25, yPos + 5);
  applySmallText(pdf);
  pdf.setFont('helvetica', 'normal');
  pdf.text('hello@humanmetrix.co.uk', 25, yPos + 9);
  
  yPos += 18;
  
  // Disclaimer
  applySmallText(pdf);
  pdf.setFont('helvetica', 'italic');
  const disclaimer = 'This recommendation is generated based on assessment data and role requirements analysis. It should be used as one input among multiple evaluation criteria including interviews, work samples, and reference checks for comprehensive hiring decisions.';
  const disclaimerLines = pdf.splitTextToSize(disclaimer, pageWidth - 50);
  disclaimerLines.forEach((line: string) => {
    yPos = ensurePageSpace(pdf, yPos, 4, pageHeight, pageWidth);
    pdf.text(line, 25, yPos);
    yPos += 3.5;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Add Skills Legend page at the end
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeCandidateName = candidateName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const safeRoleName = data.role.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `role-fit-${safeCandidateName}-${safeRoleName}-${timestamp}.pdf`);
}

interface IndividualReportData {
  candidate: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  fitAssessment: { scores: Record<string, number>; completedAt?: string } | null;
  aiReadinessAssessment: { scores: Record<string, number>; completedAt?: string } | null;
  promptArchitectureAssessment: {
    levels: Array<{
      level: number;
      scores: { clarity: number; structure: number; contextRelevance: number; creativity: number; iterativeImprovement: number };
      totalScore: number;
      feedback: string;
      isImported?: boolean;
      isMissing?: boolean;
    }>;
    totalScore: number;
    percentile?: number;
    completedAt?: string;
  } | null;
  aiqAssessment: { totalScore: number; scores?: Record<string, number>; completedAt?: string } | null;
  aiInsights: string | null;
  fitChartImage?: string | null;
  aiChartImage?: string | null;
}

export async function exportIndividualReportPDF(data: IndividualReportData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let yPos = 30;

  const candidateName = data.candidate.firstName || data.candidate.lastName
    ? `${data.candidate.firstName || ''} ${data.candidate.lastName || ''}`.trim()
    : data.candidate.email.split('@')[0];

  // ========== PAGE 1: HOW TO READ OUR REPORTS GUIDE ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'individual');

  // ========== PAGE 2: COVER + CANDIDATE SUMMARY ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);

  yPos = 32;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 35, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INDIVIDUAL ASSESSMENT REPORT', pageWidth / 2, yPos + 12, { align: 'center' });

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', pageWidth / 2, yPos + 20, { align: 'center' });

  pdf.setFontSize(9);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 27, { align: 'center' });

  pdf.setTextColor(0, 0, 0);

  yPos = 75;

  // Candidate Details box
  yPos = addSectionHeader(pdf, 'CANDIDATE DETAILS', yPos, pageWidth);

  const detailBoxHeight = 22;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, yPos, pageWidth - 40, detailBoxHeight, 2, 2, 'FD');

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text(candidateName, 25, yPos + 6);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(data.candidate.email, 25, yPos + 11);

  pdf.text(`Report Date: ${new Date().toLocaleDateString()}`, 25, yPos + 16);

  yPos += detailBoxHeight + 5;

  // Assessment Completion Status
  yPos = addSectionHeader(pdf, 'COMPLETION STATUS', yPos, pageWidth);

  const completionIndvDesc = 'Tracks which of the four core assessments have been completed.';
  applySmallText(pdf);
  const completionIndvDescLines = pdf.splitTextToSize(completionIndvDesc, pageWidth - 48);
  const completionIndvDescBoxH = Math.max(10, completionIndvDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, completionIndvDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(completionIndvDescLines, 24, yPos + 4);
  yPos += completionIndvDescBoxH + 3;

  const assessmentNames = ['FIT Assessment', 'AI Readiness', 'Prompt Architecture', 'AIQ'];
  const assessmentCompleted = [
    data.fitAssessment !== null,
    data.aiReadinessAssessment !== null,
    data.promptArchitectureAssessment !== null,
    data.aiqAssessment !== null
  ];

  const statusTableStartX = 20;
  const statusAssessmentColWidth = 60;
  const statusColWidth = 50;
  const statusRowHeight = 7;

  drawTableRow(pdf, statusTableStartX, yPos, [statusAssessmentColWidth, statusColWidth],
    ['Assessment', 'Status'], statusRowHeight, {
    isBold: true,
    fontSize: 8,
    fillColor: [249, 250, 251],
    textColor: [17, 24, 39]
  });
  yPos += statusRowHeight;

  assessmentNames.forEach((aName, aIndex) => {
    applySmallText(pdf);

    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.1);
    pdf.rect(statusTableStartX, yPos, statusAssessmentColWidth, statusRowHeight, 'S');
    pdf.text(aName, statusTableStartX + 2, yPos + statusRowHeight * 0.6);

    pdf.setDrawColor(200, 200, 200);
    pdf.rect(statusTableStartX + statusAssessmentColWidth, yPos, statusColWidth, statusRowHeight, 'S');

    if (assessmentCompleted[aIndex]) {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(34, 197, 94);
      pdf.text('Complete', statusTableStartX + statusAssessmentColWidth + statusColWidth / 2, yPos + statusRowHeight * 0.6, { align: 'center' });
      pdf.setTextColor(75, 85, 99);
    }

    yPos += statusRowHeight;
  });

  yPos += 10;
  pdf.setTextColor(0, 0, 0);

  // Trait Profile Summary
  yPos = addSectionHeader(pdf, 'TRAIT PROFILE SUMMARY', yPos, pageWidth);

  const traitDescText = 'Top strengths and development areas based on all completed skill-based assessments.';
  applySmallText(pdf);
  const traitDescLines = pdf.splitTextToSize(traitDescText, pageWidth - 48);
  const traitDescBoxH = Math.max(10, traitDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(240, 249, 255);
  pdf.roundedRect(20, yPos - 2, pageWidth - 40, traitDescBoxH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(traitDescLines, 24, yPos + 4);
  yPos += traitDescBoxH + 8;

  const allSkills: Array<{ name: string; score: number; category: string }> = [];

  if (data.fitAssessment) {
    FIT_SKILLS.forEach(skill => {
      const score = data.fitAssessment!.scores[skill.key];
      if (score !== undefined) {
        allSkills.push({ name: skill.displayName, score, category: 'FIT' });
      }
    });
  }

  if (data.aiReadinessAssessment) {
    AI_READINESS_SKILLS.forEach(skill => {
      const score = getAIReadinessScore(data.aiReadinessAssessment!.scores, skill.displayName);
      if (score !== undefined && score > 0) {
        allSkills.push({ name: skill.displayName, score, category: 'AI Readiness' });
      }
    });
  }

  const sortedSkills = [...allSkills].sort((a, b) => b.score - a.score);
  const strengths = sortedSkills.slice(0, 3);
  const weaknesses = sortedSkills.slice(-3).reverse();

  const halfWidth = (pageWidth - 50) / 2;
  const strengthsX = 20;
  const weaknessesX = 20 + halfWidth + 10;

  applySmallText(pdf);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 139, 34);
  pdf.text('TOP STRENGTHS', strengthsX, yPos);

  pdf.setTextColor(220, 120, 50);
  pdf.text('DEVELOPMENT AREAS', weaknessesX, yPos);
  yPos += 5;

  for (let i = 0; i < 3; i++) {
    if (strengths[i]) {
      applySmallText(pdf);
      let truncSName = strengths[i].name;
      const sMaxW = halfWidth - 18;
      while (pdf.getTextWidth(truncSName) > sMaxW && truncSName.length > 3) { truncSName = truncSName.slice(0, -1); }
      if (truncSName !== strengths[i].name) truncSName = truncSName.trim() + '..';
      pdf.text(truncSName, strengthsX, yPos);
      pdf.setFont('helvetica', 'bold');
      const sColor = strengths[i].score >= 80 ? [34, 139, 34] : strengths[i].score >= 60 ? [59, 130, 246] : [107, 114, 128];
      pdf.setTextColor(sColor[0], sColor[1], sColor[2]);
      pdf.text(`${strengths[i].score}`, strengthsX + halfWidth - 12, yPos);
    }

    if (weaknesses[i]) {
      applySmallText(pdf);
      let truncWName = weaknesses[i].name;
      const wMaxW = halfWidth - 18;
      while (pdf.getTextWidth(truncWName) > wMaxW && truncWName.length > 3) { truncWName = truncWName.slice(0, -1); }
      if (truncWName !== weaknesses[i].name) truncWName = truncWName.trim() + '..';
      pdf.text(truncWName, weaknessesX, yPos);
      pdf.setFont('helvetica', 'bold');
      const wColor = weaknesses[i].score < 50 ? [220, 38, 38] : weaknesses[i].score < 65 ? [220, 120, 50] : [107, 114, 128];
      pdf.setTextColor(wColor[0], wColor[1], wColor[2]);
      pdf.text(`${weaknesses[i].score}`, weaknessesX + halfWidth - 12, yPos);
    }

    yPos += 6;
  }

  yPos += 5;

  // ========== PAGE 3+: FIT ASSESSMENT DETAILS ==========
  if (data.fitAssessment) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;

    yPos = addSectionHeader(pdf, 'FIT ASSESSMENT', yPos, pageWidth);

    const fitDescText = 'Behavioral assessment measuring core competencies: agency, curiosity, resilience, empathy, and collaboration.';
    applySmallText(pdf);
    const fitDescLines = pdf.splitTextToSize(fitDescText, pageWidth - 48);
    const fitDescBoxH = Math.max(10, fitDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, fitDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(fitDescLines, 24, yPos + 4);
    yPos += fitDescBoxH + 3;

    if (data.fitChartImage) {
      const chartWidth = 85;
      const chartHeight = 58;
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(data.fitChartImage, 'JPEG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 5;
    }

    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);

    applySubheading(pdf);
    pdf.text('FIT Skills Breakdown', 20, yPos);
    yPos += 5;

    const barMaxWidth = 60;
    const barX = 85;
    const labelX = 20;
    const scoreX = barX + barMaxWidth + 5;

    const sortedFitSkills = [...FIT_SKILLS]
      .map(skill => ({ ...skill, score: data.fitAssessment!.scores[skill.key] ?? 0 }))
      .sort((a, b) => b.score - a.score);

    sortedFitSkills.forEach(skill => {
      yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
      const score = skill.score;
      const perf = getBluePerformanceLevel(score);

      applySmallText(pdf);
      pdf.setTextColor(55, 65, 81);
      let truncFitLabel = skill.displayName;
      while (pdf.getTextWidth(truncFitLabel) > 62 && truncFitLabel.length > 3) { truncFitLabel = truncFitLabel.slice(0, -1); }
      if (truncFitLabel !== skill.displayName) truncFitLabel = truncFitLabel.trim() + '..';
      pdf.text(truncFitLabel, labelX, yPos + 3);

      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(barX, yPos, barMaxWidth, 4, 1, 1, 'F');
      pdf.setFillColor(59, 130, 246);
      if (score > 0) {
        pdf.roundedRect(barX, yPos, (score / 100) * barMaxWidth, 4, 1, 1, 'F');
      }

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${score}`, scoreX, yPos + 3);

      pdf.setFontSize(7);
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(perf.label, scoreX + 10, yPos + 3);

      yPos += 8;
    });

    yPos += 5;
  }

  // ========== AI READINESS ASSESSMENT DETAILS ==========
  if (data.aiReadinessAssessment) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;

    yPos = addSectionHeader(pdf, 'AI READINESS ASSESSMENT', yPos, pageWidth);

    const aiDescText = 'Evaluates preparedness for AI-augmented work across technical fluency, problem-solving, and human-AI collaboration.';
    applySmallText(pdf);
    const aiDescLines = pdf.splitTextToSize(aiDescText, pageWidth - 48);
    const aiDescBoxH = Math.max(10, aiDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, aiDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(aiDescLines, 24, yPos + 4);
    yPos += aiDescBoxH + 3;

    if (data.aiChartImage) {
      const chartWidth = 85;
      const chartHeight = 58;
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(data.aiChartImage, 'JPEG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 5;
    }

    yPos = ensurePageSpace(pdf, yPos, 70, pageHeight, pageWidth);

    applySubheading(pdf);
    pdf.text('AI Readiness Skills Breakdown', 20, yPos);
    yPos += 5;

    const aiBarMaxWidth = 60;
    const aiBarX = 85;
    const aiLabelX = 20;
    const aiScoreX = aiBarX + aiBarMaxWidth + 5;

    const sortedAiSkills = [...AI_READINESS_SKILLS]
      .map(skill => ({ ...skill, score: getAIReadinessScore(data.aiReadinessAssessment!.scores, skill.displayName) }))
      .sort((a, b) => b.score - a.score);

    sortedAiSkills.forEach(skill => {
      yPos = ensurePageSpace(pdf, yPos, 10, pageHeight, pageWidth);
      const score = skill.score;
      const perf = getBluePerformanceLevel(score);

      applySmallText(pdf);
      pdf.setTextColor(55, 65, 81);
      let truncAiLabel = skill.displayName;
      while (pdf.getTextWidth(truncAiLabel) > 62 && truncAiLabel.length > 3) { truncAiLabel = truncAiLabel.slice(0, -1); }
      if (truncAiLabel !== skill.displayName) truncAiLabel = truncAiLabel.trim() + '..';
      pdf.text(truncAiLabel, aiLabelX, yPos + 3);

      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(aiBarX, yPos, aiBarMaxWidth, 4, 1, 1, 'F');
      pdf.setFillColor(59, 130, 246);
      if (score > 0) {
        pdf.roundedRect(aiBarX, yPos, (score / 100) * aiBarMaxWidth, 4, 1, 1, 'F');
      }

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${score}`, aiScoreX, yPos + 3);

      pdf.setFontSize(7);
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(perf.label, aiScoreX + 10, yPos + 3);

      yPos += 8;
    });

    yPos += 5;
  }

  // ========== PROMPT ARCHITECTURE ASSESSMENT ==========
  if (data.promptArchitectureAssessment) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;

    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);

    const promptDesc = 'Evaluates ability to craft effective AI prompts across 7 progressive difficulty levels, measuring clarity, structure, context relevance, creativity, and iterative improvement skills.';
    applySmallText(pdf);
    const promptDescLines = pdf.splitTextToSize(promptDesc, pageWidth - 48);
    const promptDescBoxH = Math.max(10, promptDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, promptDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(promptDescLines, 24, yPos + 4);
    yPos += promptDescBoxH + 3;

    const promptScore = data.promptArchitectureAssessment.totalScore;
    const promptPerf = getBluePerformanceLevel(promptScore);

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(20, yPos, pageWidth - 40, 22, 2, 2, 'FD');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(`Overall Score: ${promptScore}/100`, 25, yPos + 8);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
    pdf.text(promptPerf.label, 25, yPos + 14);

    if (data.promptArchitectureAssessment.percentile !== undefined) {
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Percentile: ${data.promptArchitectureAssessment.percentile}th`, 25, yPos + 19);
    }

    yPos += 27;

    const promptBarMaxWidth = 90;
    const promptBarX = 40;

    const levelColors: [number, number, number][] = [
      [147, 197, 253],
      [129, 186, 250],
      [96, 165, 250],
      [59, 130, 246],
      [37, 99, 235],
      [29, 78, 216],
      [30, 64, 175],
    ];

    for (let level = 1; level <= 7; level++) {
      const levelData = data.promptArchitectureAssessment.levels.find(l => l.level === level);

      applySmallText(pdf);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Level ${level}`, 20, yPos + 4.5);

      if (levelData && !levelData.isMissing) {
        const score = levelData.totalScore;
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(promptBarX, yPos, promptBarMaxWidth, 7, 1.5, 1.5, 'F');
        const color = levelColors[level - 1];
        pdf.setFillColor(color[0], color[1], color[2]);
        if (score > 0) {
          pdf.roundedRect(promptBarX, yPos, (score / 100) * promptBarMaxWidth, 7, 1.5, 1.5, 'F');
        }

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${score}%`, promptBarX + promptBarMaxWidth + 5, yPos + 4.5);
      } else {
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(promptBarX, yPos, promptBarMaxWidth, 7, 1.5, 1.5, 'F');
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(8);
        pdf.text('N/A', promptBarX + promptBarMaxWidth + 5, yPos + 4.5);
      }

      yPos += 10;
    }

    yPos += 5;
  }

  // ========== AIQ ASSESSMENT ==========
  if (data.aiqAssessment) {
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);

    yPos = addSectionHeader(pdf, 'AIQ ASSESSMENT', yPos, pageWidth);

    const aiqSectionDescText = 'Measures understanding of AI ethics, bias awareness, fairness, and responsible AI governance.';
    applySmallText(pdf);
    const aiqSectionDescLines = pdf.splitTextToSize(aiqSectionDescText, pageWidth - 48);
    const aiqSectionDescBoxH = Math.max(10, aiqSectionDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, aiqSectionDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(aiqSectionDescLines, 24, yPos + 4);
    yPos += aiqSectionDescBoxH + 3;

    const aiqScore = data.aiqAssessment.totalScore;
    const aiqBand = getAIQBandInterpretation(aiqScore);
    const getBandColor = (score: number): [number, number, number] => {
      if (score >= 80) return [34, 197, 94];
      if (score >= 60) return [59, 130, 246];
      if (score >= 40) return [245, 158, 11];
      if (score >= 20) return [249, 115, 22];
      return [239, 68, 68];
    };
    const bandColor = getBandColor(aiqScore);

    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(bandColor[0], bandColor[1], bandColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(20, yPos, pageWidth - 40, 28, 2, 2, 'FD');

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`${aiqScore}`, 30, yPos + 12);

    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text('/100', 45, yPos + 12);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(bandColor[0], bandColor[1], bandColor[2]);
    pdf.text(aiqBand.title, 30, yPos + 19);

    const aiqDescLines = pdf.splitTextToSize(aiqBand.description, pageWidth - 90);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    aiqDescLines.forEach((line: string, idx: number) => {
      pdf.text(line, 80, yPos + 8 + (idx * 4));
    });

    yPos += 33;
  }

  // ========== PROFILE INSIGHTS & RECOMMENDATIONS ==========
  if (data.aiInsights) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 32;

    yPos = addSectionHeader(pdf, 'PROFILE INSIGHTS & RECOMMENDATIONS', yPos, pageWidth);
    yPos += 2;

    const profileInsightsDesc = 'AI-generated analysis of this candidate\'s assessment results, highlighting role fit, strengths, development areas, and overall recommendations for hiring managers.';
    applySmallText(pdf);
    const profileInsightsDescLines = pdf.splitTextToSize(profileInsightsDesc, pageWidth - 48);
    const profileInsightsDescBoxH = Math.max(10, profileInsightsDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(240, 249, 255);
    pdf.roundedRect(20, yPos - 2, pageWidth - 40, profileInsightsDescBoxH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(profileInsightsDescLines, 24, yPos + 4);
    yPos += profileInsightsDescBoxH + 8;

    const insightSections = [
      { key: 'ROLE SUITABILITY', color: [30, 64, 175] as [number, number, number] },
      { key: 'OPTIMAL ENVIRONMENT', color: [22, 163, 74] as [number, number, number] },
      { key: 'KEY STRENGTHS', color: [34, 139, 34] as [number, number, number] },
      { key: 'DEVELOPMENT FOCUS', color: [220, 120, 50] as [number, number, number] },
      { key: 'OVERALL ASSESSMENT AND RECOMMENDATION', color: [59, 130, 246] as [number, number, number] },
    ];

    let parsedAny = false;

    insightSections.forEach(section => {
      const regex = new RegExp(`\\*\\*${section.key}\\*\\*[:\\s]*([\\s\\S]*?)(?=\\n\\s*\\*\\*[A-Z]|$)`, 'i');
      const match = data.aiInsights!.match(regex);

      if (match && match[1]?.trim()) {
        parsedAny = true;
        yPos = ensurePageSpace(pdf, yPos, 25, pageHeight, pageWidth);

        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(section.color[0], section.color[1], section.color[2]);
        pdf.text(section.key, 20, yPos);
        yPos += 5;

        applySmallText(pdf);
        pdf.setTextColor(55, 65, 81);
        const cleanedBody = match[1].trim()
          .replace(/\*\*/g, '')
          .replace(/^(\d+\.\s*)[-–—•]\s+/gm, '$1')
          .replace(/^\s*[-–—•]\s+/gm, '');
        const bodyLines = pdf.splitTextToSize(cleanedBody, pageWidth - 40);
        bodyLines.forEach((line: string) => {
          yPos = ensurePageSpace(pdf, yPos, 6, pageHeight, pageWidth);
          pdf.text(line, 20, yPos);
          yPos += 4;
        });

        yPos += 4;
      }
    });

    if (!parsedAny) {
      applySmallText(pdf);
      pdf.setTextColor(55, 65, 81);
      const cleanedFull = data.aiInsights
        .replace(/\*\*/g, '')
        .replace(/^(\d+\.\s*)[-–—•]\s+/gm, '$1')
        .replace(/^\s*[-–—•]\s+/gm, '');
      const fullLines = pdf.splitTextToSize(cleanedFull, pageWidth - 40);
      fullLines.forEach((line: string) => {
        yPos = ensurePageSpace(pdf, yPos, 6, pageHeight, pageWidth);
        pdf.text(line, 20, yPos);
        yPos += 4;
      });
      yPos += 4;
    }
  }

  // ========== RECOMMENDED NEXT STEPS & ADDITIONAL SERVICES ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;

  yPos = addSectionHeader(pdf, 'RECOMMENDED NEXT STEPS', yPos, pageWidth);
  yPos += 3;

  const completedScores: number[] = [];
  if (data.fitAssessment) {
    const fitVals = Object.values(data.fitAssessment.scores);
    if (fitVals.length > 0) completedScores.push(fitVals.reduce((a, b) => a + b, 0) / fitVals.length);
  }
  if (data.aiReadinessAssessment) {
    const aiVals = Object.values(data.aiReadinessAssessment.scores);
    if (aiVals.length > 0) completedScores.push(aiVals.reduce((a, b) => a + b, 0) / aiVals.length);
  }
  if (data.promptArchitectureAssessment) {
    completedScores.push(data.promptArchitectureAssessment.totalScore);
  }
  if (data.aiqAssessment) {
    completedScores.push(data.aiqAssessment.totalScore);
  }
  const avgScore = completedScores.length > 0
    ? Math.round(completedScores.reduce((a, b) => a + b, 0) / completedScores.length)
    : 0;

  let nextSteps: string[];
  if (avgScore >= 80) {
    nextSteps = [
      'Consider for advanced or leadership-track positions that leverage their exceptional assessment profile.',
      'Explore opportunities for the candidate to mentor or lead AI adoption initiatives within your organisation.',
      'Proceed to final-stage interviews focusing on cultural fit and strategic alignment.',
      'Discuss compensation and role expectations aligned with their high-calibre assessment results.',
    ];
  } else if (avgScore >= 60) {
    nextSteps = [
      'Schedule a competency-based interview to explore areas of moderate performance in more depth.',
      'Consider targeted upskilling programmes to bridge identified skill gaps before onboarding.',
      'Evaluate the candidate for roles that align with their strongest assessed competencies.',
      'Request references that can validate the skills demonstrated in the assessment.',
    ];
  } else {
    nextSteps = [
      'Recommend structured development programmes to address foundational skill gaps identified in the assessment.',
      'Consider the candidate for entry-level or developmental roles with clear progression pathways.',
      'Provide feedback on assessment results and discuss potential for growth with the candidate.',
      'Re-assess after a defined development period to measure improvement.',
    ];
  }

  let stepNum = 1;
  nextSteps.forEach(step => {
    yPos = ensurePageSpace(pdf, yPos, 12, pageHeight, pageWidth);

    pdf.setFillColor(59, 130, 246);
    pdf.circle(25, yPos + 2, 3, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${stepNum}`, 25, yPos + 3, { align: 'center' });

    applyBodyText(pdf);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + 2 + (idx * 5));
    });
    yPos += (stepLines.length * 5) + 5;
    stepNum++;
  });

  yPos += 10;

  // ADDITIONAL SERVICES ON REQUEST
  yPos = ensurePageSpace(pdf, yPos, 90, pageHeight, pageWidth);
  yPos = addSectionHeader(pdf, 'ADDITIONAL SERVICES ON REQUEST', yPos, pageWidth);
  yPos += 3;

  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text('HumanMetrix offers additional analysis services to support your hiring decision:', 20, yPos);
  yPos += 10;

  const additionalServices = [
    {
      name: 'Suggested Interview Questions',
      description: 'Customized interview questions based on assessment results and identified skill gaps'
    },
    {
      name: 'Team Composition Fit',
      description: 'Analysis of how the candidate would integrate with your existing team dynamics and structure'
    },
    {
      name: 'Time to Productivity Estimate',
      description: 'Projected timeline for the candidate to reach full productivity in the role'
    },
    {
      name: 'Hiring Risk Analysis',
      description: 'Comprehensive risk assessment including potential challenges and mitigation strategies'
    },
    {
      name: 'Development Investment Cost',
      description: 'Estimated training and development investment required to bridge identified skill gaps'
    }
  ];

  additionalServices.forEach((service, index) => {
    yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);

    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPos - 2, 6, 6, 1, 1, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${index + 1}`, 23, yPos + 2, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(service.name, 30, yPos + 2);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const descLines = pdf.splitTextToSize(service.description, pageWidth - 55);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + 8 + (idx * 5));
    });

    yPos += 8 + (descLines.length * 5) + 4;
  });

  yPos += 6;

  // Contact info box
  yPos = ensurePageSpace(pdf, yPos, 40, pageHeight, pageWidth);
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(59, 130, 246);
  pdf.roundedRect(20, yPos, pageWidth - 40, 16, 2, 2, 'FD');

  pdf.setFontSize(10);
  pdf.setTextColor(30, 58, 138);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact the HumanMetrix team to learn more about these services', 25, yPos + 6);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('hello@humanmetrix.co.uk', 25, yPos + 12);

  yPos += 22;

  // Closing disclaimer
  yPos = ensurePageSpace(pdf, yPos, 20, pageHeight, pageWidth);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  const closingText = 'This recommendation is generated based solely on assessment data and should be considered alongside interviews, references, and other evaluation criteria for comprehensive hiring decisions.';
  const closingLines = pdf.splitTextToSize(closingText, pageWidth - 50);
  closingLines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 5;
  });

  pdf.setTextColor(0, 0, 0);

  // Skills Legend page
  addSkillsLegendPage(pdf, pageWidth, pageHeight);

  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }

  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeCandidateName = candidateName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `individual-report-${safeCandidateName}-${timestamp}.pdf`);
}

export async function exportCandidatePDF(candidate: CandidateData, skills: Array<{name: string, score: number, assessment: string}>) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Candidate Assessment Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Candidate Info
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Candidate Information', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const candidateName = candidate.user.firstName || candidate.user.lastName
    ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
    : 'No Name';
  pdf.setFont('helvetica', 'bold');
  pdf.text(`Name: ${candidateName}`, 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  yPosition += 6;
  pdf.text(`Email: ${candidate.user.email}`, 20, yPosition);
  yPosition += 6;
  pdf.text(`Assessments Completed: ${candidate.results?.filter((r: any) => r.status === 'completed').length || 0}`, 20, yPosition);
  yPosition += 15;

  // Skills Summary
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skills Summary', 20, yPosition);
  yPosition += 8;

  // Table headers
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skill', 20, yPosition);
  pdf.text('Score', 130, yPosition);
  pdf.text('Assessment', 160, yPosition);
  yPosition += 2;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 5;

  // Skills
  pdf.setFont('helvetica', 'normal');
  skills.forEach((skill, index) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    const skillName = skill.name.length > 40 ? skill.name.substring(0, 37) + '...' : skill.name;
    pdf.text(skillName, 20, yPosition);
    pdf.text(`${skill.score}/100`, 130, yPosition);
    
    const assessmentName = skill.assessment.length > 20 ? skill.assessment.substring(0, 17) + '...' : skill.assessment;
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(assessmentName, 160, yPosition);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(9);

    yPosition += 6;

    if (index % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPosition - 5, pageWidth - 40, 6, 'F');
    }
  });

  // Add Skills Legend page at the end
  addSkillsLegendPage(pdf, pageWidth, pageHeight);

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    
    // Skills Legend note (except on last page which IS the skills legend)
    if (i < totalPages) {
      pdf.setFontSize(7);
      pdf.text(
        'Skills Legend available on last page',
        pageWidth / 2,
        pageHeight - 14,
        { align: 'center' }
      );
      pdf.setFontSize(8);
    }
    
    pdf.text(
      `Page ${i} of ${totalPages} - HumanMetrix Assessment Platform`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeCandidateName = candidateName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `candidate-report-${safeCandidateName}-${timestamp}.pdf`);
}

// Multi-Candidate Role Fit Comparison data structure
interface MultiCandidateComparisonData {
  roleSnapshot: {
    roleId: string;
    roleName: string;
    requiredSkillScores: any;
  };
  candidateEntries: Array<{
    userId: string;
    userName: string;
    email: string;
    overallFit: number | null;
    rank: number | null;
    fitTier: 'strong' | 'moderate' | 'development-needed' | 'insufficient-data';
    skillScores: Array<{
      skillName: string;
      score: number | null;
      requiredScore: number;
      gap: number | null;
      alignment: string;
      criticality: 'critical' | 'standard';
      category: 'fit' | 'ai_readiness';
      dataAvailable?: boolean;
    }>;
    strengths: (string | { skill: string; summary: string; description: string })[];
    gaps: (string | { skill: string; summary: string; description: string })[];
    riskFlags: string[];
    dataCoverage?: {
      percentage: number;
      assessedSkillCount: number;
      totalRequiredSkills: number;
      missingAssessments: string[];
      hasSufficientData?: boolean;
    };
    missingAssessments?: string[];
    hasSufficientData?: boolean;
  }>;
  summaryInsights: {
    topPerformer: { userId: string; userName: string; overallFit: number };
    averageFit: number;
    fitDistribution: { strong: number; moderate: number; developmentNeeded: number };
    commonStrengths: string[];
    commonGaps: string[];
    keyDifferentiators: string[];
    // Advanced Analytics (optional)
    skillDominance?: Array<{ candidateName: string; winsCount: number; totalSkills: number }>;
    consistencyScores?: Array<{ candidateName: string; consistencyScore: number; interpretation: string }>;
    criticalGapRatios?: Array<{ candidateName: string; criticalGaps: number; totalCritical: number; riskLevel: string }>;
    largestDifferential?: { skillName: string; topCandidate: string; topScore: number; bottomCandidate: string; bottomScore: number; spread?: number; criticality?: string } | null;
  };
  barChartImage?: string | null;
  promptArchitectureAnalysis?: string | null;
  aiqAnalysis?: string | null;
  criticalSkillNames?: string[];
}

export async function exportMultiCandidateComparisonPDF(data: MultiCandidateComparisonData) {
  if (!data.candidateEntries || data.candidateEntries.length === 0) {
    console.error('Cannot generate multi-candidate comparison PDF: No candidates provided');
    return;
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  let yPos = 30;

  // ========== PAGE 1: HOW TO READ THIS REPORT ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'multi-candidate');

  // ========== PAGE 2: SUMMARY DASHBOARD ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);

  yPos = 35;

  // Blue Title Header
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 30, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MULTI-CANDIDATE ROLE FIT COMPARISON', pageWidth / 2, yPos + 11, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Target Role: ${data.roleSnapshot.roleName}`, pageWidth / 2, yPos + 19, { align: 'center' });

  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleDateString()} | ${data.candidateEntries.length} Candidates Assessed`, pageWidth / 2, yPos + 25, { align: 'center' });

  pdf.setTextColor(0, 0, 0);
  yPos = 72;

  const CARD_PADDING = 6;
  const BLOCK_SPACING = 8;
  const MARGIN = 20;
  const contentWidth = pageWidth - MARGIN * 2;

  // Helper: extract string from strength/gap items (may be string or {skill, summary} object)
  const extractText = (item: any): string => typeof item === 'string' ? item : (item.skill || item.summary || String(item));

  // ========== SUMMARY CARDS ==========
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 36;
  const cardGap = 5;

  // Unified card style helper - matches other PDF exports (light gray bg, rounded-2)
  const drawSummaryCard = (x: number, borderColor: [number, number, number]) => {
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(x, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  };

  // Card 1: Top Performer
  const topPerformerName = String(data.summaryInsights.topPerformer?.userName || 'N/A');
  const topPerformerFitVal = data.summaryInsights.topPerformer?.overallFit ?? 0;
  const topTierColor: [number, number, number] = topPerformerFitVal >= 80 ? [34, 197, 94] : topPerformerFitVal >= 60 ? [234, 179, 8] : [239, 68, 68];

  drawSummaryCard(MARGIN, topTierColor);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('TOP PERFORMER', MARGIN + CARD_PADDING, yPos + 8);

  const topName = topPerformerName.length > 20 ? topPerformerName.slice(0, 18) + '...' : topPerformerName;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(topName, MARGIN + CARD_PADDING, yPos + 17);

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(topTierColor[0], topTierColor[1], topTierColor[2]);
  pdf.text(`${topPerformerFitVal}%`, MARGIN + CARD_PADDING, yPos + 29);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Role Fit Score', MARGIN + CARD_PADDING + 22, yPos + 29);

  // Card 2: Candidates Assessed
  const card2X = MARGIN + cardWidth + cardGap;
  drawSummaryCard(card2X, [59, 130, 246]);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('CANDIDATES ASSESSED', card2X + CARD_PADDING, yPos + 8);

  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text(`${data.candidateEntries.length}`, card2X + CARD_PADDING, yPos + 26);

  // Card 3: Fit Distribution
  const card3X = card2X + cardWidth + cardGap;
  drawSummaryCard(card3X, [59, 130, 246]);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('FIT DISTRIBUTION', card3X + CARD_PADDING, yPos + 8);

  // Distribution badges - colored rounded rectangles with count
  const badgeY = yPos + 14;
  const badgeW = (cardWidth - CARD_PADDING * 2 - 6) / 3;
  const distributionData = [
    { count: data.summaryInsights.fitDistribution.strong, label: 'Strong', bg: [220, 252, 231] as [number, number, number], text: [22, 101, 52] as [number, number, number] },
    { count: data.summaryInsights.fitDistribution.moderate, label: 'Moderate', bg: [254, 249, 195] as [number, number, number], text: [133, 77, 14] as [number, number, number] },
    { count: data.summaryInsights.fitDistribution.developmentNeeded, label: 'Needs Dev', bg: [254, 226, 226] as [number, number, number], text: [153, 27, 27] as [number, number, number] },
  ];

  distributionData.forEach((d, i) => {
    const bx = card3X + CARD_PADDING + i * (badgeW + 3);
    pdf.setFillColor(d.bg[0], d.bg[1], d.bg[2]);
    pdf.roundedRect(bx, badgeY, badgeW, 16, 2, 2, 'F');
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(d.text[0], d.text[1], d.text[2]);
    pdf.text(`${d.count}`, bx + badgeW / 2, badgeY + 7, { align: 'center' });
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(d.text[0], d.text[1], d.text[2]);
    pdf.text(d.label, bx + badgeW / 2, badgeY + 13, { align: 'center' });
  });

  pdf.setTextColor(0, 0, 0);
  yPos += cardHeight + BLOCK_SPACING + 2;

  // ========== COHORT INSIGHTS ==========
  yPos = addSectionHeader(pdf, 'COHORT INSIGHTS', yPos, pageWidth);
  yPos += 2;
  const cohortDesc = 'Overview of shared strengths, development areas, and key differentiators across all candidates.';
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const cohortDescLines = pdf.splitTextToSize(cohortDesc, contentWidth - 8);
  const cohortDescH = Math.max(10, cohortDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.roundedRect(MARGIN, yPos - 2, contentWidth, cohortDescH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(cohortDescLines, MARGIN + 4, yPos + 4);
  yPos += cohortDescH + 3;

  const halfWidth = (contentWidth - 10) / 2;
  const insightBoxHeight = 38;

  // Common Strengths - Light green tint
  pdf.setFillColor(240, 249, 255);
  pdf.setDrawColor(134, 197, 134);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(MARGIN, yPos, halfWidth, insightBoxHeight, 2, 2, 'FD');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 84, 52);
  pdf.text('Common Strengths', MARGIN + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  if (data.summaryInsights.commonStrengths.length > 0) {
    data.summaryInsights.commonStrengths.slice(0, 4).forEach((s: any, i: number) => {
      const sText = extractText(s);
      const truncated = sText.length > 35 ? sText.slice(0, 33) + '...' : sText;
      pdf.text(`\u2022 ${truncated}`, MARGIN + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 6));
    });
  } else {
    pdf.text('No common strengths identified', MARGIN + CARD_PADDING, yPos + CARD_PADDING + 12);
  }

  // Common Development Areas - Light amber tint
  const rightX = MARGIN + halfWidth + 10;
  pdf.setFillColor(255, 251, 235);
  pdf.setDrawColor(217, 166, 76);
  pdf.roundedRect(rightX, yPos, halfWidth, insightBoxHeight, 2, 2, 'FD');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(133, 77, 14);
  pdf.text('Common Development Areas', rightX + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  if (data.summaryInsights.commonGaps.length > 0) {
    data.summaryInsights.commonGaps.slice(0, 4).forEach((g: any, i: number) => {
      const gText = extractText(g);
      const truncated = gText.length > 35 ? gText.slice(0, 33) + '...' : gText;
      pdf.text(`\u2022 ${truncated}`, rightX + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 6));
    });
  } else {
    pdf.text('No common gaps identified', rightX + CARD_PADDING, yPos + CARD_PADDING + 12);
  }

  yPos += insightBoxHeight + BLOCK_SPACING;

  // Key Differentiators - Blue-tinted
  if (data.summaryInsights.keyDifferentiators.length > 0) {
    yPos = addSectionHeader(pdf, 'KEY DIFFERENTIATORS', yPos, pageWidth);
    yPos += 2;
    const diffDesc = 'Factors that most distinguish candidates from each other in this role comparison.';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const diffDescLines = pdf.splitTextToSize(diffDesc, contentWidth - 8);
    const diffDescH = Math.max(10, diffDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(MARGIN, yPos - 2, contentWidth, diffDescH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(diffDescLines, MARGIN + 4, yPos + 4);
    yPos += diffDescH + 3;
    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(0.3);
    const diffItems = data.summaryInsights.keyDifferentiators.slice(0, 3);
    const diffBoxHeight = 6 + diffItems.length * 5;
    pdf.roundedRect(MARGIN, yPos, contentWidth, diffBoxHeight, 2, 2, 'FD');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(30, 64, 175);
    diffItems.forEach((d, i) => {
      const truncated = d.length > 90 ? d.slice(0, 88) + '...' : d;
      pdf.text(`\u2022 ${truncated}`, MARGIN + CARD_PADDING, yPos + 4 + (i * 5));
    });
    yPos += diffBoxHeight + BLOCK_SPACING;
  }

  // ========== PROMPT ARCHITECTURE AI ANALYSIS (if available) ==========
  if (data.promptArchitectureAnalysis) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }

    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ANALYSIS', yPos, pageWidth);
    yPos += 2;
    const paDesc = 'Assessment of candidates\' ability to design and structure effective AI prompts for this role.';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const paDescLines = pdf.splitTextToSize(paDesc, contentWidth - 8);
    const paDescH = Math.max(10, paDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(MARGIN, yPos - 2, contentWidth, paDescH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(paDescLines, MARGIN + 4, yPos + 4);
    yPos += paDescH + 3;

    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(0.3);

    const maxWidthPA = pageWidth - 52;
    const paragraphsPA = data.promptArchitectureAnalysis.split('\n\n');
    let totalHeightPA = 8;
    const allLinesPA: string[] = [];

    paragraphsPA.forEach(para => {
      const lines = pdf.splitTextToSize(para, maxWidthPA);
      allLinesPA.push(...lines, '');
    });

    totalHeightPA += allLinesPA.length * 4;
    const boxHeightPA = Math.min(totalHeightPA, 60);

    pdf.roundedRect(MARGIN, yPos, contentWidth, boxHeightPA, 2, 2, 'FD');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);

    let textYPA = yPos + 6;
    const maxLinesPA = Math.floor((boxHeightPA - 8) / 4);
    allLinesPA.slice(0, maxLinesPA).forEach((line) => {
      if (line === '') {
        textYPA += 2;
      } else {
        pdf.text(line, 26, textYPA);
        textYPA += 4;
      }
    });

    yPos += boxHeightPA + BLOCK_SPACING;
  }

  // ========== AIQ AI ANALYSIS (if available) ==========
  if (data.aiqAnalysis) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }

    yPos = addSectionHeader(pdf, 'AIQ ASSESSMENT', yPos, pageWidth);
    yPos += 2;
    const aiqDesc = 'Evaluation of candidates\' algorithmic integrity and ethical AI decision-making capabilities.';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const aiqDescLines = pdf.splitTextToSize(aiqDesc, contentWidth - 8);
    const aiqDescH = Math.max(10, aiqDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(MARGIN, yPos - 2, contentWidth, aiqDescH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(aiqDescLines, MARGIN + 4, yPos + 4);
    yPos += aiqDescH + 3;

    pdf.setFillColor(240, 249, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(0.3);

    const maxWidthAIQ = pageWidth - 52;
    const paragraphsAIQ = data.aiqAnalysis.split('\n\n');
    let totalHeightAIQ = 8;
    const allLinesAIQ: string[] = [];

    paragraphsAIQ.forEach(para => {
      const lines = pdf.splitTextToSize(para, maxWidthAIQ);
      allLinesAIQ.push(...lines, '');
    });

    totalHeightAIQ += allLinesAIQ.length * 4;
    const boxHeightAIQ = Math.min(totalHeightAIQ, 60);

    pdf.roundedRect(MARGIN, yPos, contentWidth, boxHeightAIQ, 2, 2, 'FD');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);

    let textYAIQ = yPos + 6;
    const maxLinesAIQ = Math.floor((boxHeightAIQ - 8) / 4);
    allLinesAIQ.slice(0, maxLinesAIQ).forEach((line) => {
      if (line === '') {
        textYAIQ += 2;
      } else {
        pdf.text(line, 26, textYAIQ);
        textYAIQ += 4;
      }
    });

    yPos += boxHeightAIQ + BLOCK_SPACING;
  }

  // ========== CANDIDATE RANKINGS PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 35;

  yPos = addSectionHeader(pdf, 'CANDIDATE RANKINGS', yPos, pageWidth);
  yPos += 2;
  const rankDesc = 'Candidates ranked by overall role fit score with key performance indicators and tier classification.';
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  const rankDescLines = pdf.splitTextToSize(rankDesc, contentWidth - 8);
  const rankDescH = Math.max(10, rankDescLines.length * 4 + 4);
  pdf.setFillColor(240, 249, 255);
  pdf.roundedRect(MARGIN, yPos - 2, contentWidth, rankDescH, 2, 2, 'F');
  pdf.setTextColor(71, 85, 105);
  pdf.text(rankDescLines, MARGIN + 4, yPos + 4);
  yPos += rankDescH + 3;

  const tableX = MARGIN;
  const tableWidth = contentWidth;
  const col = {
    rank: 14,
    name: 48,
    fit: 18,
    tier: 28,
    notes: tableWidth - 14 - 48 - 18 - 28,
  };

  // Header row
  pdf.setFillColor(239, 246, 255);
  pdf.roundedRect(tableX, yPos, tableWidth, 9, 2, 2, 'F');
  pdf.setDrawColor(191, 219, 254);
  pdf.setLineWidth(0.3);
  pdf.line(tableX, yPos + 9, tableX + tableWidth, yPos + 9);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  let hx = tableX;
  pdf.text('RANK', hx + 3, yPos + 6);
  hx += col.rank;
  pdf.text('CANDIDATE', hx + 3, yPos + 6);
  hx += col.name;
  pdf.text('FIT %', hx + 2, yPos + 6);
  hx += col.fit;
  pdf.text('TIER', hx + 3, yPos + 6);
  hx += col.tier;
  pdf.text('KEY NOTES', hx + 3, yPos + 6);

  yPos += 11;

  data.candidateEntries.forEach((candidate, idx) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }

    const firstStrength = candidate.strengths.length > 0
      ? (typeof candidate.strengths[0] === 'string' ? candidate.strengths[0] : candidate.strengths[0].skill)
      : '';
    const notesRaw = candidate.riskFlags.length > 0
      ? candidate.riskFlags[0]
      : firstStrength.replace('Strong ', '');
    const notesLines = pdf.splitTextToSize(notesRaw, col.notes - 6);
    const displayLines = notesLines.slice(0, 2);
    const rowHeight = Math.max(16, 6 + displayLines.length * 4.5);

    // Alternating row background
    if (idx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(tableX, yPos, tableWidth, rowHeight, 'F');
    }

    // Bottom border line
    pdf.setDrawColor(229, 231, 235);
    pdf.setLineWidth(0.2);
    pdf.line(tableX, yPos + rowHeight, tableX + tableWidth, yPos + rowHeight);

    let cx = tableX;
    const rowMidY = yPos + rowHeight / 2;

    // Rank - medal colors for top 3
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    if (idx === 0) {
      pdf.setTextColor(234, 179, 8);
    } else if (idx === 1) {
      pdf.setTextColor(156, 163, 175);
    } else if (idx === 2) {
      pdf.setTextColor(180, 83, 9);
    } else {
      pdf.setTextColor(107, 114, 128);
    }
    pdf.text(`${candidate.rank}`, cx + col.rank / 2, rowMidY + 1, { align: 'center' });
    cx += col.rank;

    // Candidate name + email
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    const truncName = candidate.userName.length > 20 ? candidate.userName.slice(0, 18) + '...' : candidate.userName;
    pdf.text(truncName, cx + 3, yPos + 6);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(6.5);
    pdf.setTextColor(107, 114, 128);
    const truncEmail = candidate.email.length > 28 ? candidate.email.slice(0, 26) + '...' : candidate.email;
    pdf.text(truncEmail, cx + 3, yPos + 11);
    cx += col.name;

    // Fit percentage
    const fitVal = candidate.overallFit ?? 0;
    const fitColor: [number, number, number] = fitVal >= 80 ? [34, 197, 94] : fitVal >= 60 ? [234, 179, 8] : [239, 68, 68];
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
    pdf.text(`${candidate.overallFit}%`, cx + 2, rowMidY + 1);
    cx += col.fit;

    // Tier badge
    const tierLabel = candidate.fitTier === 'strong' ? 'Strong' :
                      candidate.fitTier === 'moderate' ? 'Moderate' :
                      candidate.fitTier === 'insufficient-data' ? 'No Data' : 'Dev Needed';
    const tierBgColor: [number, number, number] = candidate.fitTier === 'strong' ? [220, 252, 231] :
                          candidate.fitTier === 'moderate' ? [254, 249, 195] : [254, 226, 226];
    const tierTextColor: [number, number, number] = candidate.fitTier === 'strong' ? [22, 101, 52] :
                          candidate.fitTier === 'moderate' ? [133, 77, 14] : [153, 27, 27];
    const badgeW = pdf.getStringUnitWidth(tierLabel) * 7 * 0.352778 + 6;
    pdf.setFillColor(tierBgColor[0], tierBgColor[1], tierBgColor[2]);
    pdf.roundedRect(cx + 2, rowMidY - 4, badgeW, 8, 2, 2, 'F');
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(tierTextColor[0], tierTextColor[1], tierTextColor[2]);
    pdf.text(tierLabel, cx + 5, rowMidY + 1);
    cx += col.tier;

    // Key notes - multi-line with wrapping
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    displayLines.forEach((line: string, li: number) => {
      pdf.text(line, cx + 3, yPos + 6 + (li * 4.5));
    });

    yPos += rowHeight;
  });

  // ========== CRITICAL SKILLS DASHBOARD TABLE ==========
  const roleSkills = data.roleSnapshot.requiredSkillScores;
  const skillCriticality = roleSkills?.skillCriticality || {};

  const multiPdfCriticalNames = data.criticalSkillNames
    ? new Set(data.criticalSkillNames)
    : null;

  const criticalSkillsWithRequirements: Array<{ skillName: string; requiredScore: number; category: 'fit' | 'ai_readiness' }> = [];

  if (roleSkills?.fitSkills) {
    Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
      const isCritical = multiPdfCriticalNames
        ? multiPdfCriticalNames.has(skillName)
        : skillCriticality[skillName] === 'critical';
      if (isCritical) {
        criticalSkillsWithRequirements.push({ skillName, requiredScore: requiredScore as number, category: 'fit' });
      }
    });
  }
  if (roleSkills?.aiReadinessSkills) {
    Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
      const isCritical = multiPdfCriticalNames
        ? multiPdfCriticalNames.has(skillName)
        : skillCriticality[skillName] === 'critical';
      if (isCritical) {
        criticalSkillsWithRequirements.push({ skillName, requiredScore: requiredScore as number, category: 'ai_readiness' });
      }
    });
  }

  criticalSkillsWithRequirements.sort((a, b) => b.requiredScore - a.requiredScore);
  const cappedCriticalSkills = multiPdfCriticalNames
    ? criticalSkillsWithRequirements
    : criticalSkillsWithRequirements.slice(0, 6);

  if (cappedCriticalSkills.length > 0) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;

    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS DASHBOARD', yPos, pageWidth);
    yPos += 2;
    const csdDesc = 'Must-have skills for this role. Candidates must meet thresholds on these critical skills.';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const csdDescLines = pdf.splitTextToSize(csdDesc, contentWidth - 8);
    const csdDescH = Math.max(10, csdDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(MARGIN, yPos - 2, contentWidth, csdDescH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(csdDescLines, MARGIN + 4, yPos + 4);
    yPos += csdDescH + 3;

    const sortedCandidates = [...data.candidateEntries].sort((a, b) => {
      const aHasData = a.hasSufficientData !== false && a.overallFit != null;
      const bHasData = b.hasSufficientData !== false && b.overallFit != null;
      if (!aHasData && !bHasData) return 0;
      if (!aHasData) return 1;
      if (!bHasData) return -1;
      if (a.rank === null && b.rank === null) return 0;
      if (a.rank === null) return 1;
      if (b.rank === null) return -1;
      return a.rank - b.rank;
    });

    const candidateCount = Math.min(sortedCandidates.length, 5);
    const skillColWidth = 50;
    const reqColWidth = 18;
    const candidateColWidth = (pageWidth - 40 - skillColWidth - reqColWidth) / candidateCount;

    // Blue-tinted header
    pdf.setFillColor(239, 246, 255);
    pdf.rect(20, yPos, pageWidth - 40, 12, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Critical Skill', 22, yPos + 8);
    pdf.text('Req', 20 + skillColWidth + 2, yPos + 8);

    sortedCandidates.slice(0, candidateCount).forEach((candidateForHeader, idx) => {
      const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);
      const name = candidateForHeader.userName.split(' ')[0];
      const truncHeaderName = name.length > 10 ? name.slice(0, 9) + '.' : name;

      if (idx === 0 && candidateForHeader.overallFit != null) {
        pdf.setFillColor(219, 234, 254);
        pdf.rect(colX, yPos, candidateColWidth, 12, 'F');
      }

      pdf.setTextColor(59, 130, 246);
      pdf.text(truncHeaderName, colX + 2, yPos + 8);
    });

    yPos += 14;

    // Table rows with mini progress bars
    cappedCriticalSkills.forEach((criticalSkill, skillIdx) => {
      if (yPos > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }

      const skillRowHeight = 14;

      if (skillIdx % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, skillRowHeight, 'F');
      }

      // Skill name
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const skillNameTrunc = criticalSkill.skillName.length > 25 ? criticalSkill.skillName.slice(0, 23) + '...' : criticalSkill.skillName;
      pdf.text(skillNameTrunc, 22, yPos + 5);

      // Required score
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text(`${criticalSkill.requiredScore}+`, 20 + skillColWidth + 2, yPos + 5);

      // Each candidate's score with mini progress bar
      sortedCandidates.slice(0, candidateCount).forEach((candidateForRow, idx) => {
        const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);
        const skill = findSkillInScores(candidateForRow.skillScores, criticalSkill.skillName);
        const hasData = skill?.dataAvailable !== false && skill?.score != null;
        const score = skill?.score || 0;
        const meetsRequired = hasData && score >= criticalSkill.requiredScore;
        const meetsThreshold = hasData && score >= 60;

        if (idx === 0 && candidateForRow.overallFit != null) {
          pdf.setFillColor(240, 249, 255);
          pdf.rect(colX, yPos - 3, candidateColWidth, skillRowHeight, 'F');
        }

        if (!hasData) {
          pdf.setTextColor(156, 163, 175);
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(7);
          pdf.text('N/A', colX + 2, yPos + 5);
          pdf.setFont('helvetica', 'normal');
        } else {
          // Mini progress bar
          const barW = candidateColWidth - 18;
          const barH = 4;
          const barStartX = colX + 2;
          const barY = yPos + 1;

          pdf.setFillColor(229, 231, 235);
          pdf.roundedRect(barStartX, barY, barW, barH, 1, 1, 'F');

          const fillColor: [number, number, number] = meetsRequired ? [34, 197, 94] : meetsThreshold ? [234, 179, 8] : [239, 68, 68];
          pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          const fillW = Math.max(1, (score / 100) * barW);
          pdf.roundedRect(barStartX, barY, fillW, barH, 1, 1, 'F');

          // Required threshold line
          const threshX = barStartX + (criticalSkill.requiredScore / 100) * barW;
          pdf.setDrawColor(17, 24, 39);
          pdf.setLineWidth(0.4);
          pdf.line(threshX, barY - 0.5, threshX, barY + barH + 0.5);

          // Score text
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(7);
          pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
          pdf.text(`${score}`, colX + candidateColWidth - 15, yPos + 5);

          const indicator = meetsRequired ? '+' : meetsThreshold ? '~' : '-';
          pdf.text(indicator, colX + candidateColWidth - 8, yPos + 5);
          pdf.setFont('helvetica', 'normal');
        }
      });

      yPos += skillRowHeight;
    });

    // Footer row: Critical Skills Met
    pdf.setFillColor(239, 246, 255);
    pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Critical Skills Met', 22, yPos + 5);
    pdf.text('\u2014', 20 + skillColWidth + 2, yPos + 5);

    sortedCandidates.slice(0, candidateCount).forEach((candidateForFooter, idx) => {
      const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);

      const criticalSkillsMet = cappedCriticalSkills.filter(cs => {
        const skill = findSkillInScores(candidateForFooter.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
      }).length;

      const assessedCritical = cappedCriticalSkills.filter(cs => {
        const skill = findSkillInScores(candidateForFooter.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null;
      }).length;

      if (assessedCritical === 0) {
        pdf.setTextColor(156, 163, 175);
        pdf.text('No data', colX + 2, yPos + 5);
      } else {
        const allMet = criticalSkillsMet === cappedCriticalSkills.length;
        pdf.setTextColor(allMet ? 34 : 239, allMet ? 197 : 68, allMet ? 94 : 68);
        pdf.text(`${criticalSkillsMet}/${assessedCritical}`, colX + 2, yPos + 5);
      }
    });

    yPos += 15;

    // Legend with colored shapes
    let legendX = 20;
    const legendY = yPos;

    pdf.setFillColor(34, 197, 94);
    pdf.roundedRect(legendX, legendY - 2.5, 8, 3.5, 1, 1, 'F');
    legendX += 10;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Meets required', legendX, legendY);
    legendX += 30;

    pdf.setTextColor(156, 163, 175);
    pdf.text('|', legendX, legendY);
    legendX += 5;

    pdf.setFillColor(234, 179, 8);
    pdf.roundedRect(legendX, legendY - 2.5, 8, 3.5, 1, 1, 'F');
    legendX += 10;
    pdf.setTextColor(107, 114, 128);
    pdf.text('Above 60 but below required', legendX, legendY);
    legendX += 52;

    pdf.setTextColor(156, 163, 175);
    pdf.text('|', legendX, legendY);
    legendX += 5;

    pdf.setFillColor(239, 68, 68);
    pdf.roundedRect(legendX, legendY - 2.5, 8, 3.5, 1, 1, 'F');
    legendX += 10;
    pdf.setTextColor(107, 114, 128);
    pdf.text('Below 60 threshold', legendX, legendY);

    // ========== CRITICAL SKILLS DEEP DIVE ==========
    const SKILL_DESCRIPTIONS: Record<string, string> = {
      "High Agency": "Enables proactive problem-solving and ownership of outcomes, reducing dependency on constant supervision in fast-moving AI environments.",
      "Intellectual Curiosity": "Drives continuous learning and exploration of new technologies, essential for staying current in rapidly evolving AI landscape.",
      "Resilience": "Supports persistence through setbacks and ambiguity, critical for navigating complex AI implementation challenges.",
      "Empathy & Ethics": "Ensures AI solutions consider human impact and ethical implications, vital for responsible AI deployment.",
      "Growth Mindset": "Facilitates adaptation to new tools and methodologies, enabling continuous improvement in AI capabilities.",
      "Interpersonal Agility": "Essential for effective collaboration across diverse teams and stakeholders in complex AI initiatives.",
      "AI Literacy & Prompt Engineering": "Foundational understanding of AI concepts and effective prompt engineering, required for AI-augmented work.",
      "Technical Fundamentals": "Core technical knowledge enabling effective interaction with AI systems and tools.",
      "Data Fluency": "Ability to work with and interpret data, essential for leveraging AI insights effectively.",
      "Critical Thinking & Problem-Solving": "Key for evaluating AI recommendations and identifying optimal solutions to complex challenges.",
      "Adaptability & Continuous Learning": "Enables quick adaptation to new AI tools and evolving best practices.",
      "Collaboration & Communication": "Facilitates effective teamwork in AI-augmented environments and cross-functional projects.",
      "Responsible AI & Ethical Awareness": "Ensures ethical considerations in AI usage and deployment decisions.",
      "Creativity & Innovation": "Drives novel applications of AI technology to solve business problems.",
      "Domain Expertise": "Deep knowledge in specific areas that enhances AI application and interpretation.",
    };

    yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
    yPos += 15;
    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS DEEP DIVE', yPos, pageWidth);
    yPos += 2;
    const deepDiveDesc = 'AI-identified must-have skills for this role with detailed analysis of why each matters.';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    const deepDiveDescLines = pdf.splitTextToSize(deepDiveDesc, contentWidth - 8);
    const deepDiveDescH = Math.max(10, deepDiveDescLines.length * 4 + 4);
    pdf.setFillColor(240, 249, 255);
    pdf.roundedRect(MARGIN, yPos - 2, contentWidth, deepDiveDescH, 2, 2, 'F');
    pdf.setTextColor(71, 85, 105);
    pdf.text(deepDiveDescLines, MARGIN + 4, yPos + 4);
    yPos += deepDiveDescH + 3;

    const candidateList = sortedCandidates.slice(0, 6);

    cappedCriticalSkills.forEach((criticalSkill) => {
      const description = SKILL_DESCRIPTIONS[criticalSkill.skillName] || `Critical for success in roles requiring ${criticalSkill.skillName.toLowerCase()} capabilities.`;
      const categoryLabel = criticalSkill.category === 'fit' ? 'Behavioral' : 'Technical';

      const candidatesWithScores = candidateList.map(c => {
        const skill = findSkillInScores(c.skillScores, criticalSkill.skillName);
        const hasData = skill?.dataAvailable !== false && skill?.score != null;
        const rawScore = hasData ? (skill?.score || 0) : null;
        const score = rawScore !== null ? Math.min(100, Math.max(0, rawScore)) : null;
        const gap = score !== null ? score - criticalSkill.requiredScore : null;
        const meetsRequired = score !== null && score >= criticalSkill.requiredScore;
        return { name: c.userName, score, gap, meetsRequired, hasData, isBest: false };
      });

      let bestScore = -1;
      let bestIdx = -1;
      candidatesWithScores.forEach((c, i) => {
        if (c.hasData && c.score !== null && c.score > bestScore) {
          bestScore = c.score;
          bestIdx = i;
        }
      });
      if (bestIdx >= 0) candidatesWithScores[bestIdx].isBest = true;

      const meetCount = candidatesWithScores.filter(c => c.meetsRequired).length;
      const assessedCount = candidatesWithScores.filter(c => c.hasData).length;

      const barRowH = 9;
      const headerH = 30;
      const candidateAreaH = candidateList.length * barRowH + 6;
      const legendH = 10;
      const totalCardH = headerH + candidateAreaH + legendH + 4;

      yPos = ensurePageSpace(pdf, yPos, totalCardH + 5, pageHeight, pageWidth);

      const cardX = MARGIN;
      const cardW = contentWidth;

      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(cardX, yPos, cardW, totalCardH, 2, 2, 'FD');

      let innerY = yPos + 4;

      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(cardX + 4, innerY, 24, 5.5, 1, 1, 'F');
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('CRITICAL', cardX + 6, innerY + 4);

      const catBadgeX = cardX + 31;
      pdf.setFillColor(219, 234, 254);
      const catW = pdf.getTextWidth(categoryLabel) + 6;
      pdf.roundedRect(catBadgeX, innerY, catW + 2, 5.5, 1, 1, 'F');
      pdf.setFontSize(5);
      pdf.setTextColor(30, 64, 175);
      pdf.text(categoryLabel, catBadgeX + 3, innerY + 4);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const reqText = `Required: ${criticalSkill.requiredScore}/100`;
      const reqTextW = pdf.getTextWidth(reqText);
      pdf.text(reqText, cardX + cardW - reqTextW - 6, innerY + 4);

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      const skillNameStartX = catBadgeX + catW + 6;
      const skillNameMaxW = (cardX + cardW - reqTextW - 10) - skillNameStartX;
      let skillNameText = criticalSkill.skillName;
      while (pdf.getTextWidth(skillNameText) > skillNameMaxW && skillNameText.length > 3) {
        skillNameText = skillNameText.slice(0, -1);
      }
      if (skillNameText !== criticalSkill.skillName) skillNameText = skillNameText.trim() + '..';
      pdf.text(skillNameText, skillNameStartX, innerY + 4);

      innerY += 9;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(100, 116, 139);
      const descText = `Why it matters: ${description}`;
      const descLines = pdf.splitTextToSize(descText, cardW - 12);
      pdf.text(descLines.slice(0, 2), cardX + 6, innerY + 3);
      innerY += Math.min(descLines.length, 2) * 3.5 + 4;

      pdf.setDrawColor(229, 231, 235);
      pdf.setLineWidth(0.2);
      pdf.line(cardX + 4, innerY, cardX + cardW - 4, innerY);
      innerY += 3;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text('Candidate Performance', cardX + 6, innerY + 3);

      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const meetText = `${meetCount}/${assessedCount} candidates meet requirement`;
      const meetTextW = pdf.getTextWidth(meetText);
      pdf.text(meetText, cardX + cardW - meetTextW - 6, innerY + 3);
      innerY += 7;

      const nameColW = 42;
      const barStartX = cardX + nameColW + 4;
      const scoreColW = 28;
      const barEndX = cardX + cardW - scoreColW - 6;
      const barW = barEndX - barStartX;

      candidatesWithScores.forEach((cand) => {
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        const displayName = cand.name.length > 18 ? cand.name.slice(0, 16) + '..' : cand.name;
        pdf.text(displayName, cardX + 6, innerY + 4.5);

        if (cand.isBest && cand.hasData) {
          const nameW = pdf.getTextWidth(displayName);
          pdf.setFillColor(34, 197, 94);
          pdf.roundedRect(cardX + 7 + nameW + 1, innerY + 0.5, 12, 5, 1, 1, 'F');
          pdf.setFontSize(4.5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text('Best', cardX + 8.5 + nameW + 1, innerY + 4);
        }

        if (!cand.hasData) {
          pdf.setFillColor(229, 231, 235);
          pdf.roundedRect(barStartX, innerY + 1, barW, 5, 1, 1, 'F');

          pdf.setFontSize(6.5);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(156, 163, 175);
          pdf.text('N/A', barEndX + 4, innerY + 4.5);
        } else {
          const score = cand.score!;
          const clampedReq = Math.min(100, Math.max(0, criticalSkill.requiredScore));
          const thresholdX = barStartX + (clampedReq / 100) * barW;
          const scoreFillW = Math.max(1, (score / 100) * barW);

          if (cand.meetsRequired) {
            pdf.setFillColor(229, 231, 235);
            pdf.roundedRect(barStartX, innerY + 1, barW, 5, 1, 1, 'F');

            pdf.setFillColor(34, 197, 94);
            pdf.roundedRect(barStartX, innerY + 1, scoreFillW, 5, 1, 1, 'F');
          } else {
            pdf.setFillColor(229, 231, 235);
            pdf.roundedRect(barStartX, innerY + 1, barW, 5, 1, 1, 'F');

            pdf.setFillColor(252, 165, 165);
            pdf.roundedRect(barStartX, innerY + 1, scoreFillW, 5, 1, 1, 'F');
          }

          pdf.setDrawColor(59, 130, 246);
          pdf.setLineWidth(0.5);
          const dashLen = 1;
          const gapLen = 0.8;
          let dashY = innerY + 0.2;
          const dashEndY = innerY + 6.3;
          while (dashY < dashEndY) {
            const segEnd = Math.min(dashY + dashLen, dashEndY);
            pdf.line(thresholdX, dashY, thresholdX, segEnd);
            dashY = segEnd + gapLen;
          }

          const meetsIcon = cand.meetsRequired;
          const iconColor: [number, number, number] = meetsIcon ? [34, 197, 94] : [234, 179, 8];
          pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
          const iconX = barEndX + 3;
          pdf.circle(iconX + 1.5, innerY + 3.5, 1.8, 'F');
          pdf.setFontSize(5);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(255, 255, 255);
          pdf.text(meetsIcon ? 'O' : '!', iconX + 0.7, innerY + 4.5);

          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(55, 65, 81);
          pdf.text(`${score}%`, iconX + 5, innerY + 4.5);

          const gap = cand.gap!;
          const gapStr = gap >= 0 ? `+${gap}` : `${gap}`;
          const gapColor: [number, number, number] = gap >= 0 ? [34, 197, 94] : [239, 68, 68];
          pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
          pdf.setFontSize(6.5);
          pdf.text(gapStr, iconX + 15, innerY + 4.5);
        }

        innerY += barRowH;
      });

      innerY += 2;
      const legendY = innerY;
      pdf.setFillColor(34, 197, 94);
      pdf.roundedRect(cardX + 6, legendY, 6, 3, 0.5, 0.5, 'F');
      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('Meets requirement', cardX + 14, legendY + 2.5);

      pdf.setFillColor(252, 165, 165);
      pdf.roundedRect(cardX + 50, legendY, 6, 3, 0.5, 0.5, 'F');
      pdf.text('Below requirement', cardX + 58, legendY + 2.5);

      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      let legDashY = legendY;
      const legDashEnd = legendY + 3;
      while (legDashY < legDashEnd) {
        const segEnd = Math.min(legDashY + 1, legDashEnd);
        pdf.line(cardX + 95, legDashY, cardX + 95, segEnd);
        legDashY = segEnd + 0.8;
      }
      pdf.text('Required threshold', cardX + 98, legendY + 2.5);

      yPos += totalCardH + 5;
    });
  }

  // ========== PROMPT ARCHITECTURE COMPARISON ==========
  const promptReq = data.roleSnapshot.requiredSkillScores?.promptArchitectureScore;
  if (promptReq) {
    yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
    yPos += 10;

    // Blue header for Prompt Architecture
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('PROMPT ARCHITECTURE COMPARISON', 26, yPos + 11);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Required: ${promptReq}/100`, pageWidth - 60, yPos + 11);

    yPos += 22;

    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Multi-candidate comparison of prompt engineering skills across complexity levels', 20, yPos);
    yPos += 8;

    const sortedForPrompt = [...data.candidateEntries].sort((a, b) => {
      const aScore = (a as any).promptArchitectureScore || 0;
      const bScore = (b as any).promptArchitectureScore || 0;
      return (bScore || 0) - (aScore || 0);
    });

    sortedForPrompt.slice(0, 6).forEach((candidate) => {
      if (yPos > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }

      const candidateEntry = candidate as any;
      const score = candidateEntry.promptArchitectureScore;
      const hasData = score !== null && score !== undefined;
      const meetsReq = hasData && score >= promptReq;
      const isClose = hasData && !meetsReq && score >= promptReq * 0.8;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const truncPromptName = candidate.userName.length > 15 ? candidate.userName.slice(0, 13) + '...' : candidate.userName;
      pdf.text(truncPromptName, 22, yPos + 4);

      const barX = 60;
      const barWidth = pageWidth - 130;
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(barX, yPos, barWidth, 6, 1, 1, 'F');

      if (hasData) {
        const fillColor: [number, number, number] = meetsReq ? [59, 130, 246] : isClose ? [234, 179, 8] : [239, 68, 68];
        pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.roundedRect(barX, yPos, (score / 100) * barWidth, 6, 1, 1, 'F');

        pdf.setDrawColor(17, 24, 39);
        pdf.setLineWidth(0.5);
        pdf.line(barX + (promptReq / 100) * barWidth, yPos - 1, barX + (promptReq / 100) * barWidth, yPos + 7);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.text(`${score}%`, pageWidth - 55, yPos + 4);

        const statusText = meetsReq ? '\u2713' : '\u2717';
        pdf.text(statusText, pageWidth - 30, yPos + 4);
      } else {
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No data', pageWidth - 55, yPos + 4);
      }

      yPos += 10;
    });

    yPos += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Why it matters: Prompt Architecture measures ability to construct effective AI prompts across increasing complexity levels.', 22, yPos);
    yPos += 10;
  }

  // ========== AIQ COMPARISON ==========
  const aiqReq = data.roleSnapshot.requiredSkillScores?.aiqScore;
  if (aiqReq) {
    yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
    yPos += 10;

    // Blue header for AIQ
    pdf.setFillColor(59, 130, 246);
    pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text('AIQ (ALGORITHMIC INTEGRITY QUOTIENT) COMPARISON', 26, yPos + 11);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Required: ${aiqReq}/100`, pageWidth - 60, yPos + 11);

    yPos += 22;

    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Multi-candidate comparison of ethical AI awareness and responsible AI deployment', 20, yPos);
    yPos += 8;

    const sortedForAiq = [...data.candidateEntries].sort((a, b) => {
      const aScore = (a as any).aiqScore || 0;
      const bScore = (b as any).aiqScore || 0;
      return (bScore || 0) - (aScore || 0);
    });

    sortedForAiq.slice(0, 6).forEach((candidate) => {
      if (yPos > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }

      const candidateEntry = candidate as any;
      const score = candidateEntry.aiqScore;
      const hasData = score !== null && score !== undefined;
      const meetsReq = hasData && score >= aiqReq;
      const isClose = hasData && !meetsReq && score >= aiqReq * 0.8;

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const truncAiqName = candidate.userName.length > 15 ? candidate.userName.slice(0, 13) + '...' : candidate.userName;
      pdf.text(truncAiqName, 22, yPos + 4);

      const barX = 60;
      const barWidth = pageWidth - 130;
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(barX, yPos, barWidth, 6, 1, 1, 'F');

      if (hasData) {
        const fillColor: [number, number, number] = meetsReq ? [59, 130, 246] : isClose ? [234, 179, 8] : [239, 68, 68];
        pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.roundedRect(barX, yPos, (score / 100) * barWidth, 6, 1, 1, 'F');

        pdf.setDrawColor(17, 24, 39);
        pdf.setLineWidth(0.5);
        pdf.line(barX + (aiqReq / 100) * barWidth, yPos - 1, barX + (aiqReq / 100) * barWidth, yPos + 7);

        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
        pdf.text(`${score}%`, pageWidth - 55, yPos + 4);

        const statusText = meetsReq ? '\u2713' : '\u2717';
        pdf.text(statusText, pageWidth - 30, yPos + 4);
      } else {
        pdf.setTextColor(156, 163, 175);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No data', pageWidth - 55, yPos + 4);
      }

      yPos += 10;
    });

    yPos += 3;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Why it matters: AIQ measures understanding of AI ethics, bias recognition, and responsible AI deployment.', 22, yPos);
    yPos += 10;
  }

  // ========== HIRING DECISION MATRIX ==========
  yPos = ensurePageSpace(pdf, yPos, 100, pageHeight, pageWidth);
  yPos += 10;
  yPos = addSectionHeader(pdf, 'HIRING DECISION MATRIX', yPos, pageWidth);
  yPos += 5;

  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Individual candidate assessment summary with hiring recommendation', 20, yPos);
  yPos += 10;

  const candidateCardWidth = (pageWidth - 50) / Math.min(4, data.candidateEntries.length);
  const candidateCardHeight = 58;
  const maxCandidatesPerRow = 4;

  const sortedForMatrix = [...data.candidateEntries].sort((a, b) => (b.overallFit ?? 0) - (a.overallFit ?? 0));

  sortedForMatrix.slice(0, 8).forEach((candidate, idx) => {
    const row = Math.floor(idx / maxCandidatesPerRow);
    const col = idx % maxCandidatesPerRow;

    if (row === 1 && col === 0) {
      yPos += candidateCardHeight + 10;
    }

    const cardX = 20 + (col * (candidateCardWidth + 3));
    const cardY = yPos;
    const cardW = candidateCardWidth - 3;

    const tierColors: Record<string, { fill: number[]; border: number[]; text: number[]; label: number[] }> = {
      'strong': { fill: [236, 253, 245], border: [34, 197, 94], text: [22, 101, 52], label: [34, 197, 94] },
      'moderate': { fill: [254, 252, 232], border: [234, 179, 8], text: [133, 77, 14], label: [161, 98, 7] },
      'development-needed': { fill: [254, 242, 242], border: [239, 68, 68], text: [153, 27, 27], label: [239, 68, 68] },
      'insufficient-data': { fill: [249, 250, 251], border: [156, 163, 175], text: [107, 114, 128], label: [107, 114, 128] }
    };
    const colors = tierColors[candidate.fitTier] || tierColors['development-needed'];

    pdf.setFillColor(colors.fill[0], colors.fill[1], colors.fill[2]);
    pdf.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(cardX, cardY, cardW, candidateCardHeight, 2, 2, 'FD');

    // Blue accent bar at top
    pdf.setFillColor(59, 130, 246);
    pdf.rect(cardX, cardY, cardW, 3, 'F');

    const userName = String(candidate.userName || 'Unknown');
    const truncCardName = userName.length > 14 ? userName.slice(0, 12) + '...' : userName;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(truncCardName, cardX + 4, cardY + 12);

    const fitPercent = candidate.overallFit ?? 0;
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.label[0], colors.label[1], colors.label[2]);
    pdf.text(`${fitPercent}%`, cardX + 4, cardY + 26);

    const fitTier = candidate.fitTier || 'insufficient-data';
    const tierLabel = fitTier === 'strong' ? 'STRONG FIT' :
                      fitTier === 'moderate' ? 'MODERATE' :
                      fitTier === 'insufficient-data' ? 'INSUFFICIENT DATA' : 'DEV NEEDED';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text(tierLabel, cardX + 4, cardY + 34);

    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);

    const strengthsArr = candidate.strengths || [];
    const risksArr = candidate.riskFlags || [];
    const gapsArr = candidate.gaps || [];

    if (strengthsArr.length > 0 && strengthsArr[0]) {
      const strengthText = String(strengthsArr[0]);
      const strength = strengthText.replace('Strong ', '').slice(0, 20);
      pdf.text(`\u2713 ${strength}...`, cardX + 4, cardY + 43);
    } else {
      pdf.setTextColor(156, 163, 175);
      pdf.text('No key strengths identified', cardX + 4, cardY + 43);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    }

    if (risksArr.length > 0 && risksArr[0]) {
      const riskText = String(risksArr[0]);
      const risk = riskText.slice(0, 22);
      pdf.text(`\u26A0 ${risk}...`, cardX + 4, cardY + 50);
    } else if (gapsArr.length > 0 && gapsArr[0]) {
      const gapText = String(gapsArr[0]);
      const gap = gapText.slice(0, 22);
      pdf.text(`Gap: ${gap}...`, cardX + 4, cardY + 50);
    } else {
      pdf.setTextColor(156, 163, 175);
      pdf.text('No critical risks identified', cardX + 4, cardY + 50);
    }
  });

  const totalRows = Math.ceil(Math.min(8, data.candidateEntries.length) / maxCandidatesPerRow);
  yPos += (candidateCardHeight * totalRows) + 15;

  // ========== SKILLS LEGEND PAGE ==========
  const legendStartPage = pdf.getNumberOfPages() + 1;
  addSkillsLegendPage(pdf, pageWidth, pageHeight);

  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    const isLegendPage = i >= legendStartPage;
    addFooter(pdf, i, totalPages, pageWidth, pageHeight, !isLegendPage);
  }

  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeRoleName = data.roleSnapshot.roleName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `multi-candidate-comparison-${safeRoleName}-${timestamp}.pdf`);
}

// Individual Report PDF - Comprehensive format matching sample reports
interface LegacyIndividualReportData {
  candidate: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  };
  candidateName: string;
  fitData: { scores: Record<string, number> } | null;
  aiData: { scores: Record<string, number> } | null;
  promptData: { totalScore: number; percentile?: number; levels?: Array<{ level: number; totalScore: number; scores?: { clarity: number; structure: number; contextRelevance: number; creativity: number; iterativeImprovement: number } }> } | null;
  aiqData: { totalScore: number } | null;
  profileInsights: string | null;
  fitChartImage?: string | null;
  aiChartImage?: string | null;
}

// Helper to generate assessment summary text
function getAssessmentSummaryText(type: 'fit' | 'ai' | 'prompt' | 'aiq', score: number): string {
  if (type === 'fit') {
    if (score >= 80) return 'Strong behavioral competencies including adaptability, curiosity, and interpersonal skills.';
    if (score >= 60) return 'Solid behavioral foundation with room for growth in specific competencies.';
    return 'Developing behavioral skills; recommend focused coaching and mentoring.';
  }
  if (type === 'ai') {
    if (score >= 80) return 'Excellent AI proficiency; fully prepared to leverage AI capabilities effectively.';
    if (score >= 60) return 'Foundational AI awareness; additional training recommended to fully leverage AI capabilities.';
    return 'Limited AI exposure; structured upskilling program recommended.';
  }
  if (type === 'prompt') {
    if (score >= 80) return 'Strong prompt engineering skills; capable of designing effective AI interactions.';
    if (score >= 60) return 'Adequate prompting abilities with potential for optimization through practice.';
    return 'Basic prompt skills; would benefit from structured prompt engineering training.';
  }
  // AIQ doesn't need summary text here as it uses band interpretation
  return '';
}

export async function generateIndividualReportPDF(data: LegacyIndividualReportData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  // Calculate common values
  const fitScores = data.fitData ? Object.values(data.fitData.scores) : [];
  const aiScores = data.aiData ? Object.values(data.aiData.scores) : [];
  const fitAvg = fitScores.length > 0 ? Math.round(fitScores.reduce((a, b) => a + b, 0) / fitScores.length) : 0;
  const aiAvg = aiScores.length > 0 ? Math.round(aiScores.reduce((a, b) => a + b, 0) / aiScores.length) : 0;
  const skillsAssessed = fitScores.length + aiScores.length;
  
  // Find top skill
  let topSkill = 'N/A';
  let topScore = 0;
  if (data.fitData) {
    Object.entries(data.fitData.scores).forEach(([name, score]) => {
      if (score > topScore) { topScore = score; topSkill = name; }
    });
  }
  if (data.aiData) {
    Object.entries(data.aiData.scores).forEach(([name, score]) => {
      if (score > topScore) { topScore = score; topSkill = name; }
    });
  }
  
  // Calculate overall average
  const allScores = [
    ...fitScores,
    ...aiScores,
    ...(data.promptData ? [data.promptData.totalScore] : []),
    ...(data.aiqData ? [data.aiqData.totalScore] : [])
  ];
  const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
  
  // ========== PAGE 1: HOW TO READ OUR REPORTS GUIDE ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'individual');
  
  // ========== PAGE 2: COVER PAGE WITH ASSESSMENT SUMMARY ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section - Blue Banner
  yPos = 50;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 45, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CANDIDATE ASSESSMENT', pageWidth / 2, yPos + 15, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', pageWidth / 2, yPos + 25, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(data.candidateName.toUpperCase(), pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // All info boxes on same row - Candidate Profile + 2 Key Metrics (all same height, aligned)
  yPos = 108;
  const rowBoxHeight = 28; // Increased height for two lines
  const totalWidth = pageWidth - 40; // 20px margin each side
  const gap = 5;
  const profileWidth = totalWidth * 0.4; // Profile takes 40% width
  const metricsWidth = (totalWidth - profileWidth - gap * 2) / 2; // Remaining 60% split into 2 boxes
  
  const completedCount = [data.fitData, data.aiData, data.promptData, data.aiqData].filter(Boolean).length;
  
  // Candidate Profile Box (left) - Two lines for name and email
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, profileWidth, rowBoxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', 20 + profileWidth / 2, yPos + 8, { align: 'center' });
  
  // Name on first line with larger font
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(17, 24, 39);
  const displayName = data.candidateName.length > 35 ? data.candidateName.substring(0, 32) + '...' : data.candidateName;
  pdf.text(displayName, 20 + profileWidth / 2, yPos + 16, { align: 'center' });
  
  // Email on second line
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  const displayEmail = data.candidate.user.email.length > 40 ? data.candidate.user.email.substring(0, 37) + '...' : data.candidate.user.email;
  pdf.text(displayEmail, 20 + profileWidth / 2, yPos + 23, { align: 'center' });
  
  // Key Metrics Boxes (right side - 2 boxes with adjusted widths)
  // Skills Assessed box is thinner, Top Skill box is wider
  const remainingWidth = totalWidth - profileWidth - gap * 2;
  const skillsBoxWidth = remainingWidth * 0.35; // Skills Assessed is narrower (35%)
  const topSkillBoxWidth = remainingWidth * 0.65; // Top Skill is wider (65%)
  
  // Skills Assessed Box (thinner)
  const skillsXPos = 20 + profileWidth + gap;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(skillsXPos, yPos, skillsBoxWidth, rowBoxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Skills Assessed', skillsXPos + skillsBoxWidth / 2, yPos + 9, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(String(skillsAssessed), skillsXPos + skillsBoxWidth / 2, yPos + 20, { align: 'center' });
  
  // Top Skill Box - wider with larger font
  const topSkillXPos = skillsXPos + skillsBoxWidth + gap;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(topSkillXPos, yPos, topSkillBoxWidth, rowBoxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Top Skill', topSkillXPos + topSkillBoxWidth / 2, yPos + 9, { align: 'center' });
  
  // Top Skill value - split to two lines if needed with larger font
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  const maxTopSkillWidth = topSkillBoxWidth - 8;
  const topSkillLines = pdf.splitTextToSize(topSkill, maxTopSkillWidth);
  const topSkillStartY = topSkillLines.length > 1 ? yPos + 15 : yPos + 18;
  topSkillLines.slice(0, 2).forEach((line: string, lineIdx: number) => {
    pdf.text(line, topSkillXPos + topSkillBoxWidth / 2, topSkillStartY + (lineIdx * 5), { align: 'center' });
  });
  
  // ASSESSMENT SUMMARY Section
  yPos = 144;
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  yPos += 10; // More space between title and first content
  
  // Assessment summary items
  const summaryItems = [
    { name: 'FIT Assessment (Behavioral Skills)', score: fitAvg, text: data.fitData ? getAssessmentSummaryText('fit', fitAvg) : null },
    { name: 'AI Readiness', score: aiAvg, text: data.aiData ? getAssessmentSummaryText('ai', aiAvg) : null },
    { name: 'Prompt Architecture', score: data.promptData?.totalScore || 0, text: data.promptData ? getAssessmentSummaryText('prompt', data.promptData.totalScore) : null },
    { name: 'Algorithmic Integrity Quotient (AIQ)', score: data.aiqData?.totalScore || 0, text: null },
  ];
  
  summaryItems.forEach((item, idx) => {
    if ((idx === 0 && !data.fitData) || (idx === 1 && !data.aiData) || 
        (idx === 2 && !data.promptData) || (idx === 3 && !data.aiqData)) return;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(item.name, 20, yPos);
    
    // Use blue colors for FIT and AI Readiness, standard colors for others
    const perf = (idx === 0 || idx === 1) ? getBluePerformanceLevel(item.score) : getPerformanceLevel(item.score);
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${item.score}/100`, pageWidth - 20, yPos, { align: 'right' });
    
    if (item.text) {
      yPos += 5;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(item.text, 25, yPos);
    }
    
    yPos += 10;
  });
  
  // ========== PAGE 2: SKILLS VISUALIZATION ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS VISUALIZATION', yPos, pageWidth);
  yPos += 12; // More space between title and first content
  
  const halfWidth = (pageWidth - 40) / 2;
  const leftColStart = 20;
  const rightColStart = leftColStart + halfWidth + 10;
  const chartWidth = halfWidth - 5;
  const chartHeight = 50; // Compact to fit FIT + AI Readiness on same page
  
  // FIT Assessment Skills
  if (data.fitData) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment - Behavioral Skills', leftColStart, yPos);
    yPos += 5;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, Interpersonal Agility', leftColStart, yPos);
    yPos += 10;
    
    const fitScoresStartY = yPos;
    
    // Left column - Individual Skill Scores
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Individual Skill Scores:', leftColStart, yPos);
    yPos += 7;
    
    Object.entries(data.fitData.scores).forEach(([skillName, score]) => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`${skillName}:`, leftColStart + 5, yPos);
      
      const perf = getBluePerformanceLevel(score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${score}`, leftColStart + halfWidth - 10, yPos, { align: 'right' });
      
      yPos += 7;
    });
    
    // Right column - Bar Chart
    if (data.fitChartImage) {
      try {
        pdf.addImage(data.fitChartImage, 'JPEG', rightColStart, fitScoresStartY - 5, chartWidth, chartHeight);
      } catch (e) {
        // Fallback: draw placeholder box
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(rightColStart, fitScoresStartY - 5, chartWidth, chartHeight, 2, 2, 'FD');
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text('FIT Assessment Chart', rightColStart + chartWidth / 2, fitScoresStartY + chartHeight / 2, { align: 'center' });
      }
    } else {
      // Draw placeholder box if no chart image
      pdf.setDrawColor(229, 231, 235);
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(rightColStart, fitScoresStartY - 5, chartWidth, chartHeight, 2, 2, 'FD');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text('FIT Assessment', rightColStart + chartWidth / 2, fitScoresStartY + 10, { align: 'center' });
      // Draw simple bar chart placeholder
      const barStartX = rightColStart + 10;
      const barStartY = fitScoresStartY + 20;
      const barW = 8;
      const barSpacing = 12;
      const maxBarH = 25;
      pdf.setFillColor(59, 130, 246);
      for (let i = 0; i < 6; i++) {
        const barH = maxBarH * (0.4 + Math.random() * 0.6);
        pdf.rect(barStartX + i * barSpacing, barStartY + maxBarH - barH, barW, barH, 'F');
      }
    }
    
    yPos = Math.max(yPos, fitScoresStartY + chartHeight) + 15;
  }
  
  // AI Readiness Skills - stays on same page as FIT
  if (data.aiData) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('AI Readiness Assessment', leftColStart, yPos);
    yPos += 6;
    
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: AI Literacy, Technical Fundamentals, Data Fluency, Critical Thinking, Adaptability, Collaboration, Responsible AI, Creativity, Domain Expertise', leftColStart, yPos);
    yPos += 8;
    
    const aiScoresStartY = yPos;
    const aiChartHeight = chartHeight; // Same height as FIT chart (50) for consistent aspect ratio
    
    // Left column - Individual Skill Scores
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Individual Skill Scores:', leftColStart, yPos);
    yPos += 7;
    
    Object.entries(data.aiData.scores).forEach(([skillName, score]) => {
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`${skillName}:`, leftColStart + 5, yPos);
      
      const perf = getBluePerformanceLevel(score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${score}`, leftColStart + halfWidth - 10, yPos, { align: 'right' });
      
      yPos += 7; // Match FIT spacing
    });
    
    // Right column - Bar Chart (positioned to align with skills list)
    if (data.aiChartImage) {
      try {
        pdf.addImage(data.aiChartImage, 'JPEG', rightColStart, aiScoresStartY + 5, chartWidth, aiChartHeight);
      } catch (e) {
        // Fallback: draw placeholder box
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(rightColStart, aiScoresStartY + 5, chartWidth, aiChartHeight, 2, 2, 'FD');
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text('AI Readiness Chart', rightColStart + chartWidth / 2, aiScoresStartY + aiChartHeight / 2, { align: 'center' });
      }
    } else {
      // Draw placeholder box if no chart image
      pdf.setDrawColor(229, 231, 235);
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(rightColStart, aiScoresStartY + 5, chartWidth, aiChartHeight, 2, 2, 'FD');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text('AI Readiness', rightColStart + chartWidth / 2, aiScoresStartY + 20, { align: 'center' });
      // Draw simple bar chart placeholder
      const barStartX = rightColStart + 10;
      const barStartY = aiScoresStartY + 25;
      const barW = 6;
      const barSpacing = 9;
      const maxBarH = 25;
      pdf.setFillColor(34, 197, 94);
      for (let i = 0; i < 9; i++) {
        const barH = maxBarH * (0.4 + Math.random() * 0.6);
        pdf.rect(barStartX + i * barSpacing, barStartY + maxBarH - barH, barW, barH, 'F');
      }
    }
    
    yPos = Math.max(yPos, aiScoresStartY + aiChartHeight) + 5;
  }
  
  // ========== PAGE 4: PROMPT ARCHITECTURE & AIQ ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  
  // Prompt Architecture Section
  if (data.promptData) {
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const promptDesc = 'Evaluates the ability to construct effective AI prompts across progressively complex scenarios. Measures clarity, structure, context relevance, creativity, and iterative improvement skills essential for leveraging generative AI tools in professional settings.';
    const promptDescLines = pdf.splitTextToSize(promptDesc, pageWidth - 40);
    promptDescLines.forEach((line: string) => {
      pdf.text(line, 20, yPos);
      yPos += 5;
    });
    yPos += 8;
    
    // Overall score box - properly sized with text inside
    const promptPerf = getPerformanceLevel(data.promptData.totalScore);
    const levelsCompleted = data.promptData.levels?.length || 7;
    
    // Measure text widths to calculate proper box size
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const labelText = 'Overall Score:';
    const labelWidth = pdf.getTextWidth(labelText);
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    const scoreText = `${data.promptData.totalScore}/100`;
    const scoreWidth = pdf.getTextWidth(scoreText);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const levelsText = `(${levelsCompleted} levels)`;
    const levelsWidth = pdf.getTextWidth(levelsText);
    
    const totalTextWidth = labelWidth + scoreWidth + levelsWidth + 12; // 12 for gaps
    const boxPadding = 10;
    const boxWidth = totalTextWidth + boxPadding * 2;
    const boxX = (pageWidth - boxWidth) / 2;
    const boxY = yPos;
    const boxHeight = 12;
    
    // Draw box
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
    pdf.setLineWidth(0.8);
    pdf.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');
    pdf.setLineWidth(0.2);
    
    // Calculate vertical center (baseline adjustment for font)
    const textY = boxY + boxHeight / 2 + 3;
    
    // Draw text left-to-right from box start
    let textX = boxX + boxPadding;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(labelText, textX, textY);
    textX += labelWidth + 4;
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
    pdf.text(scoreText, textX, textY);
    textX += scoreWidth + 4;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(levelsText, textX, textY);
    
    yPos += boxHeight + 8;
    
    // Level breakdown with visual progress bars - compact layout
    if (data.promptData.levels && data.promptData.levels.length > 0) {
      const barStartX = 35;
      const barWidth = 110; // Longer bars
      const barHeight = 4; // Thinner bars
      const levelHeight = 11; // Height per level (bar + scores + spacing)
      const legendHeight = 15; // Space for legend + post-section padding
      
      // Calculate total required height for the entire section
      const totalRequiredHeight = (data.promptData.levels.length * levelHeight) + legendHeight;
      
      // Check if we need a new page before starting the level breakdown
      if (yPos + totalRequiredHeight > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      data.promptData.levels.forEach((levelData) => {
        // Check for page overflow before drawing each level (account for full level height)
        if (yPos + levelHeight > pageHeight - 20) {
          pdf.addPage();
          addBackgroundPattern(pdf, pageWidth, pageHeight);
          addHeader(pdf, pageWidth);
          yPos = 35;
        }
        
        // Level label before the bar
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`L${levelData.level}`, barStartX - 10, yPos + 3);
        
        // Progress bar background
        pdf.setFillColor(229, 231, 235);
        pdf.roundedRect(barStartX, yPos, barWidth, barHeight, 1, 1, 'F');
        
        // Progress bar fill - blue gradient based on score
        const fillWidth = (levelData.totalScore / 100) * barWidth;
        if (fillWidth > 0) {
          const blueIntensity = Math.max(0.5, levelData.totalScore / 100);
          pdf.setFillColor(
            Math.round(59 + (1 - blueIntensity) * 100),
            Math.round(130 + (1 - blueIntensity) * 60),
            246
          );
          pdf.roundedRect(barStartX, yPos, fillWidth, barHeight, 1, 1, 'F');
        }
        
        // Score percentage after bar
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`${levelData.totalScore}%`, barStartX + barWidth + 3, yPos + 3);
        
        // Component scores underneath the bar - full names
        if (levelData.scores) {
          pdf.setFontSize(5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          const componentScores = `Clarity:${levelData.scores.clarity} Structure:${levelData.scores.structure} Context:${levelData.scores.contextRelevance} Creativity:${levelData.scores.creativity} Iterative:${levelData.scores.iterativeImprovement}`;
          pdf.text(componentScores, barStartX, yPos + barHeight + 3);
        }
        
        yPos += levelHeight; // Compact spacing between levels
      });
      
      // Check page overflow before legend
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Legend removed - using full names now
      yPos += 2;
    }
    
    yPos += 8;
  }
  
  // AIQ Section
  if (data.aiqData) {
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    yPos += 10; // More space between title and content
    
    // AIQ Explanation paragraph
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const aiqExplanation = 'The AIQ assessment evaluates a candidate\'s understanding of AI ethics and responsible AI deployment. It measures awareness of algorithmic bias, fairness considerations, transparency requirements, and the ability to identify potential ethical issues in AI systems. A higher score indicates stronger ethical AI awareness and better preparedness for roles involving AI decision-making.';
    const explanationLines = pdf.splitTextToSize(aiqExplanation, pageWidth - 40);
    explanationLines.forEach((line: string) => {
      pdf.text(line, 20, yPos);
      yPos += 5;
    });
    yPos += 5;
    
    // Measures subtitle
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: AI Ethics, Bias Detection, Fairness, Transparency, and Responsible AI Deployment', 20, yPos);
    yPos += 12;
    
    // AIQ score and band
    const aiqBand = getAIQBandInterpretation(data.aiqData.totalScore);
    const aiqPerf = getPerformanceLevel(data.aiqData.totalScore);
    
    // Centered score - smaller size
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
    pdf.text(`${data.aiqData.totalScore}%`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 7;
    
    // Band title
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text(aiqBand.title, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    
    // Band description
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(75, 85, 99);
    const descLines = pdf.splitTextToSize(aiqBand.description, pageWidth - 60);
    descLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
    });
  }
  
  // ========== PROFILE INSIGHTS (if available) ==========
  if (data.profileInsights) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    
    yPos = 35;
    yPos = addSectionHeader(pdf, 'PROFILE INSIGHTS', yPos, pageWidth);
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Generated analysis based on assessment performance patterns', 20, yPos);
    yPos += 12;
    
    // Split insights into paragraphs for separate boxes - compact layout
    const paragraphs = data.profileInsights.split('\n\n').filter((p: string) => p.trim());
    
    paragraphs.forEach((paragraph: string) => {
      pdf.setFontSize(7); // Smaller font for compact layout
      const insightLines = pdf.splitTextToSize(paragraph.trim(), pageWidth - 46);
      const boxHeight = insightLines.length * 4 + 8; // Reduced line height and padding
      
      // Check if we need a new page
      if (yPos + boxHeight > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Draw blue-bordered box
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.4);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(18, yPos - 1, pageWidth - 36, boxHeight, 2, 2, 'FD');
      
      // Draw text inside box - smaller font
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      
      let textY = yPos + 4;
      insightLines.forEach((line: string) => {
        pdf.text(line, 22, textY);
        textY += 4; // Reduced line spacing
      });
      
      yPos += boxHeight + 4; // Reduced gap between boxes
    });
  }
  
  // ========== RECOMMENDED NEXT STEPS & ADDITIONAL SERVICES ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  
  // RECOMMENDED NEXT STEPS section
  yPos = addSectionHeader(pdf, 'RECOMMENDED NEXT STEPS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Based on the assessment results, consider these next steps:', 20, yPos);
  yPos += 10;
  
  // Generate next steps based on candidate profile
  const nextSteps: string[] = [];
  
  if (avgScore >= 80) {
    nextSteps.push('Schedule a final interview to validate exceptional assessment results with practical scenarios.');
    nextSteps.push('Consider for accelerated onboarding or leadership development programs.');
    nextSteps.push('Evaluate for cross-functional project opportunities that leverage diverse strengths.');
  } else if (avgScore >= 60) {
    nextSteps.push('Conduct a structured interview focusing on identified development areas.');
    nextSteps.push('Discuss tailored training and mentorship opportunities during onboarding.');
    nextSteps.push('Consider pairing with experienced team members for knowledge transfer.');
  } else {
    nextSteps.push('Assess alignment with entry-level or developmental role requirements.');
    nextSteps.push('Explore structured upskilling programs to address skill gaps.');
    nextSteps.push('Consider role modifications that play to existing strengths while building capabilities.');
  }
  
  // Add assessment-specific next steps
  if (data.promptData && data.promptData.totalScore >= 75) {
    nextSteps.push('Leverage strong prompt engineering skills for AI integration initiatives.');
  }
  if (data.aiqData && data.aiqData.totalScore >= 80) {
    nextSteps.push('Consider for roles involving AI governance or ethical AI implementation.');
  }
  
  nextSteps.forEach(step => {
    pdf.setTextColor(37, 99, 235);
    pdf.text('•', 27, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + (idx * 5));
    });
    yPos += (stepLines.length * 5) + 3;
  });
  
  yPos += 10;
  
  // ENTERPRISE SERVICES section (matching online report)
  yPos = addSectionHeader(pdf, 'ENTERPRISE SERVICES', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Enhance your hiring process with our advanced enterprise solutions:', 20, yPos);
  yPos += 12;
  
  const enterpriseServices = [
    {
      name: 'Onboarding Service',
      description: 'Time to Productivity Estimate and Hiring Risk Analysis to optimize your onboarding process'
    },
    {
      name: 'Suggested Interview Questions',
      description: 'AI-generated questions to dig deeper into assessment results and explore trait gaps'
    },
    {
      name: 'Team Composition Fit',
      description: 'Analysis of how this candidate would complement your existing team dynamics'
    },
    {
      name: 'The Ecosystem Index',
      description: 'Comprehensive team capability diagnostic that maps skills distribution and identifies gaps'
    },
    {
      name: 'HumanMetrix Database Benchmarking',
      description: 'Compare candidate performance against our assessment database and industry benchmarks'
    },
    {
      name: 'Development Investment Cost',
      description: 'Estimated training and development investment required to bridge identified skill gaps'
    }
  ];
  
  // Display services in a 2-column grid format
  const colWidth = (pageWidth - 50) / 2;
  let serviceIndex = 0;
  
  while (serviceIndex < enterpriseServices.length) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    // Draw two services per row
    for (let col = 0; col < 2 && serviceIndex < enterpriseServices.length; col++) {
      const service = enterpriseServices[serviceIndex];
      const xPos = 20 + (col * (colWidth + 10));
      
      // Service box background
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(xPos, yPos, colWidth, 22, 2, 2, 'FD');
      
      // Service name
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text(service.name, xPos + 4, yPos + 6);
      
      // Service description - wrap to fit
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      const descLines = pdf.splitTextToSize(service.description, colWidth - 8);
      descLines.slice(0, 2).forEach((line: string, idx: number) => {
        pdf.text(line, xPos + 4, yPos + 12 + (idx * 4));
      });
      
      serviceIndex++;
    }
    
    yPos += 28;
  }
  
  // Contact information
  yPos += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Contact us at hello@humanmetrix.co.uk for more information about these services.', 20, yPos);
  
  // ========== SKILLS LEGEND PAGE ==========
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeName = data.candidateName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `individual-report-${safeName}-${timestamp}.pdf`);
}
