import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FIT_SKILLS, AI_READINESS_SKILLS, ROLE_DEFINITIONS } from './assessmentSkills';
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
  alignment: {
    overallFit: number;
    fitSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
      criticality?: 'critical' | 'important' | 'nice-to-have';
    }> | null;
    aiReadinessSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
      criticality?: 'critical' | 'important' | 'nice-to-have';
    }> | null;
    strengths: string[];
    gaps: string[];
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
  yPos = 75;
  
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
    
    yPos = addGuideItem(4, 'Cohort Benchmarking', 
      'See how this candidate ranks against all other candidates in your pipeline. Percentile shows their relative standing.', yPos);
    
    yPos = addGuideItem(5, 'Role Flexibility Analysis', 
      'Alternative roles where this candidate might excel if the primary role isn\'t ideal. Useful for internal mobility.', yPos);
    
    yPos = addGuideItem(6, 'Hiring Recommendation', 
      'Summary with specific hiring guidance, interview focus areas, and onboarding considerations.', yPos);
  } else if (reportType === 'individual') {
    // Individual Report Guide - matches IndividualReportTab.tsx
    yPos = addGuideItem(1, 'Understanding Trait-Based Scores', 
      'FIT and AI Readiness are trait-based assessments. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.', yPos);
    
    yPos = addGuideItem(2, 'AIQ (Ethics)', 
      'Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Single overall score.', yPos);
    
    yPos = addGuideItem(3, 'FIT Assessment (Behavioral)', 
      'Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores = stronger trait presence. Match against role requirements to assess fit.', yPos);
    
    yPos = addGuideItem(4, 'AI Readiness (Technical)', 
      'Measures 9 AI-related capabilities. Higher scores indicate stronger aptitude in each area. Compare to role requirements for relevance.', yPos);
    
    yPos = addGuideItem(5, 'Prompt Architecture', 
      'Evaluates AI prompt engineering skills across 4 difficulty levels. Each level tests clarity, structure, and creativity in prompt design.', yPos);
    
    yPos = addGuideItem(6, 'Trait Profile Summary', 
      'Top 3 highest and lowest scoring traits across FIT and AI Readiness. Use Role Fit analysis or Candidate Comparison tool to determine which traits matter for specific positions.', yPos);
  } else if (reportType === 'multi-candidate') {
    // Multi-Candidate Role Fit Report Guide - matches MultiCandidateRoleFitTab.tsx
    yPos = addGuideItem(1, 'Summary Cards', 
      'Quick overview showing the top performer, average fit score across all candidates, total candidate count, and distribution by fit tier (Strong 80%+, Moderate 60-79%, Development Needed below 60%).', yPos);
    
    yPos = addGuideItem(2, 'Cohort Insights', 
      'Common strengths shared by multiple candidates and common development areas where the cohort may need improvement. Key differentiators highlight what sets candidates apart.', yPos);
    
    yPos = addGuideItem(3, 'Overall Fit Comparison Chart', 
      'Visual bar chart ranking all candidates by their role fit percentage. Use this to quickly identify top performers and compare relative standings.', yPos);
    
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
      'Radar charts and tables show each candidate\'s strengths. Look for the highest scores in skills critical to your role.', yPos);
    
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
  
  // Skill abbreviation mapping (matching radar chart labels)
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
  
  // Add description for candidate details
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Overview of candidates included in this comparison report.', 20, yPos);
  yPos += 5;
  
  // Draw candidate details in boxes - compact horizontal layout
  const candidateBoxWidth = (pageWidth - 40 - (data.candidates.length - 1) * 5) / data.candidates.length;
  const candidateBoxHeight = 22;
  let candX = 20;
  
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    
    // Draw box with light background and colored outline only
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(candX, yPos, candidateBoxWidth, candidateBoxHeight, 2, 2, 'FD');
    
    const textStartX = candX + 5;
    
    // Name
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const nameText = getCandidateName(candidate);
    const truncatedName = nameText.length > 20 ? nameText.substring(0, 18) + '...' : nameText;
    pdf.text(truncatedName, textStartX, yPos + 6);
    
    // Email
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const maxEmailLen = Math.floor(candidateBoxWidth / 2.5);
    const emailText = candidate.user.email.length > maxEmailLen ? candidate.user.email.substring(0, maxEmailLen - 3) + '...' : candidate.user.email;
    pdf.text(emailText, textStartX, yPos + 11);
    
    // Application date
    const appliedDate = candidate.user.createdAt 
      ? new Date(candidate.user.createdAt).toLocaleDateString() 
      : 'N/A';
    pdf.text(`Applied: ${appliedDate}`, textStartX, yPos + 16);
    
    candX += candidateBoxWidth + 5; // Add gap between boxes
  });
  
  yPos += candidateBoxHeight + 5;
  
  // Assessment Completion Status - IMPROVED TABLE
  yPos = addSectionHeader(pdf, 'COMPLETION STATUS', yPos, pageWidth);
  
  // Add description for completion status
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  const completionDesc = 'Tracks which of the four core assessments each candidate has completed.';
  pdf.text(completionDesc, 20, yPos);
  yPos += 5;
  
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
    
    // Draw rank with medal for top position
    applySmallText(pdf);
    pdf.setFont('helvetica', 'bold');
    if (ranking.rank === 1) {
      pdf.setTextColor(245, 158, 11); // Gold
    } else if (ranking.rank === 2) {
      pdf.setTextColor(156, 163, 175); // Silver
    } else {
      pdf.setTextColor(180, 83, 9); // Bronze
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
  
  // ========== PAGE 2: RADAR CHARTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 32;
  
  // FIT Assessment Radar Charts
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
      
      pdf.addImage(image, 'PNG', xPos, chartYPos, chartWidth, chartHeight);
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
  
  // AI Readiness Radar Charts - ALWAYS start on a new page to keep chart + table together
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
    const aiChartWidth = 85; // Horizontally stretched within 4:3 aspect container
    const aiChartHeight = 58;
    
    aiCharts.forEach((image, index) => {
      if (!image) return;
      // Center the chart within its column
      const columnStart = 15 + (index % aiChartsPerRow) * aiColumnWidth;
      const xPos = columnStart + (aiColumnWidth - aiChartWidth) / 2;
      const chartYPos = yPos + Math.floor(index / aiChartsPerRow) * (aiChartHeight + 5);
      
      pdf.addImage(image, 'PNG', xPos, chartYPos, aiChartWidth, aiChartHeight);
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
    
    // Use larger dimensions - 170mm height for bigger radar chart
    const imgProps = pdf.getImageProperties(data.overallSkillsChartImage);
    const maxWidth = pageWidth - 25; // Wider margins for bigger chart
    const maxHeight = 170; // Larger height for bigger chart display
    const scale = Math.min(maxWidth / imgProps.width, maxHeight / imgProps.height);
    const chartWidth = imgProps.width * scale;
    const chartHeight = imgProps.height * scale;
    const xPos = (pageWidth - chartWidth) / 2;
    
    pdf.addImage(data.overallSkillsChartImage, 'PNG', xPos, yPos, chartWidth, chartHeight);
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
    
    // Add description for Prompt Architecture section
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    const promptDesc = 'Evaluates ability to craft effective AI prompts across 7 progressive difficulty levels, measuring clarity, structure, context relevance, creativity, and iterative improvement skills.';
    const splitPromptDesc = pdf.splitTextToSize(promptDesc, pageWidth - 40);
    pdf.text(splitPromptDesc, 20, yPos);
    yPos += splitPromptDesc.length * 4 + 4;
    
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
  
  // Add description for Strengths & Development section
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  const strengthsDesc = 'Highlights each candidate\'s top 3 strongest skills and areas requiring development, based on assessment scores across all completed evaluations.';
  const splitStrengthsDesc = pdf.splitTextToSize(strengthsDesc, pageWidth - 40);
  pdf.text(splitStrengthsDesc, 20, yPos);
  yPos += splitStrengthsDesc.length * 4 + 4;
  
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
        // Skill name - allow full name display with wider column
        applySmallText(pdf);
        const maxNameWidth = columnWidth - 18; // Leave space for score
        const skillName = strength.name;
        pdf.text(skillName, colX, yPos, { maxWidth: maxNameWidth });
        
        // Score badge
        pdf.setFont('helvetica', 'bold');
        const scoreColor = strength.score >= 80 ? [34, 139, 34] : strength.score >= 60 ? [59, 130, 246] : [107, 114, 128];
        pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.text(`${strength.score}`, colX + columnWidth - 12, yPos);
      }
    });
    yPos += 6;
  }
  
  yPos += 5;
  
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
        // Skill name - allow full name display with wider column
        applySmallText(pdf);
        const maxNameWidth = columnWidth - 18; // Leave space for score
        const skillName = weakness.name;
        pdf.text(skillName, colX, yPos, { maxWidth: maxNameWidth });
        
        // Score badge
        pdf.setFont('helvetica', 'bold');
        const scoreColor = weakness.score < 50 ? [220, 38, 38] : weakness.score < 65 ? [220, 120, 50] : [107, 114, 128];
        pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        pdf.text(`${weakness.score}`, colX + columnWidth - 12, yPos);
      }
    });
    yPos += 6;
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
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(71, 85, 105);
    
    const topProfile = candidateProfiles[0];
    const secondProfile = candidateProfiles[1];
    let profileText = `Skills Analysis: ${topProfile.name} leads in top strengths averaging ${topProfile.strengthAvg}/100, excelling in ${topProfile.topStrength.name} (${topProfile.topStrength.score}/100).`;
    if (topProfile.topWeakness) {
      profileText += ` Development focus: ${topProfile.topWeakness.name} (${topProfile.topWeakness.score}/100).`;
    }
    if (secondProfile.topStrength) {
      profileText += ` ${secondProfile.name} shows strength in ${secondProfile.topStrength.name} (${secondProfile.topStrength.score}/100).`;
    }
    
    const splitProfileText = pdf.splitTextToSize(profileText, pageWidth - 48);
    pdf.text(splitProfileText, 24, yPos + 6);
    yPos += 18;
  }
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  
  // ========== ENHANCED ANALYSIS PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
  
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
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
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
      const criticality = skillCriticality[skillName] || 'important';
      if (criticality === 'critical') return 2.0;
      if (criticality === 'important') return 1.5;
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
    
    // Apply critical gap penalty: 10% reduction per critical gap (capped at 50%)
    if (criticalGaps > 0 && totalCriticalSkills > 0) {
      const criticalPenalty = criticalGaps * 0.10;
      score = score * (1 - Math.min(criticalPenalty, 0.5));
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
  
  // ========== EMPLOYER RECOMMENDATION ==========
  yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
  
  yPos = addSectionHeader(pdf, 'EMPLOYER RECOMMENDATION', yPos, pageWidth);
  
  // Add description for employer recommendation
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('AI-generated hiring guidance based on composite assessment scores and role alignment analysis.', 20, yPos);
  yPos += 10;
  
  // Add Comparison Summary header for the selected role
  if (data.selectedRole && roleData) {
    const roleLabel = roleData.name ?? 'Selected Role';
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`Comparison Summary for the ${roleLabel} role`, 20, yPos);
    yPos += 8;
  }
  
  // Use passed-in employer recommendation from dashboard if available
  if (data.employerRecommendation) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const recLines = pdf.splitTextToSize(data.employerRecommendation, pageWidth - 50);
    recLines.forEach((line: string) => {
      yPos = ensurePageSpace(pdf, yPos, 6, pageHeight, pageWidth);
      pdf.text(line, 25, yPos);
      yPos += 5;
    });
    yPos += 5;
  } else {
    // Fallback to generic recommendation if no dashboard data
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const fallbackText = 'Based on the comprehensive assessment data, review each candidate\'s performance metrics to determine the best fit for your role requirements.';
    const lines = pdf.splitTextToSize(fallbackText, pageWidth - 50);
    lines.forEach((line: string) => {
      pdf.text(line, 25, yPos);
      yPos += 5;
    });
    yPos += 5;
  }
  
  // Individual candidate summaries using composite scores
  // Calculate composite score for each candidate (weighted average across all 4 assessment types)
  const calculateCompositeScore = (candidateIndex: number): number => {
    const weights = data.assessmentWeights || { fit: 25, aiReadiness: 25, promptArchitecture: 25, aiq: 25 };
    const assessmentScores: Array<{ score: number; weight: number }> = [];
    
    // FIT average
    const fitData = data.fitAssessments?.[candidateIndex];
    if (fitData) {
      const fitScores = Object.values(fitData.scores);
      if (fitScores.length > 0) {
        const fitAvg = fitScores.reduce((a, b) => a + b, 0) / fitScores.length;
        assessmentScores.push({ score: fitAvg, weight: weights.fit });
      }
    }
    
    // AI Readiness average
    const aiData = data.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      const aiScores = Object.values(aiData.scores);
      if (aiScores.length > 0) {
        const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        assessmentScores.push({ score: aiAvg, weight: weights.aiReadiness });
      }
    }
    
    // Prompt Architecture
    const promptData = data.promptArchitectureAssessments?.[candidateIndex];
    if (promptData) {
      assessmentScores.push({ score: promptData.totalScore, weight: weights.promptArchitecture });
    }
    
    // AIQ
    const aiqData = data.aiqAssessments?.[candidateIndex];
    if (aiqData) {
      assessmentScores.push({ score: aiqData.totalScore, weight: weights.aiq });
    }
    
    if (assessmentScores.length === 0) return 0;
    
    const totalWeight = assessmentScores.reduce((sum, d) => sum + d.weight, 0);
    if (totalWeight === 0) return 0;
    
    const weightedSum = assessmentScores.reduce((sum, d) => sum + d.score * d.weight, 0);
    return Math.round(weightedSum / totalWeight);
  };

  const candidateAnalysis = data.candidates.map((candidate, index) => {
    const name = getCandidateName(candidate);
    const compositeScore = calculateCompositeScore(index);
    
    // Track which assessments are completed
    const completedAssessments: string[] = [];
    if (data.fitAssessments?.[index]) completedAssessments.push('FIT');
    if (data.aiReadinessAssessments?.[index]) completedAssessments.push('AI Readiness');
    if (data.promptArchitectureAssessments?.[index]) completedAssessments.push('Prompt Architecture');
    if (data.aiqAssessments?.[index]) completedAssessments.push('AIQ');
    
    const completedCount = completedAssessments.length;
    
    const candidateSkills = data.skillComparison
      .map(skill => ({ name: skill.skillName, score: skill.scores[index] }))
      .filter(s => s.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
    
    return { name, compositeScore, completedCount, completedAssessments, topSkills: candidateSkills };
  });
  
  const rankedCandidates = [...candidateAnalysis].sort((a, b) => b.compositeScore - a.compositeScore);
  
  rankedCandidates.forEach((candidate, rankIndex) => {
    const candidateColor = CANDIDATE_COLORS[data.candidates.findIndex(c => getCandidateName(c) === candidate.name)] || [100, 100, 100];
    const perfLevel = getPerformanceLevel(candidate.compositeScore);
    
    // Calculate box height based on content
    const scoreLine = `Composite Score: ${candidate.compositeScore}/100 (${perfLevel.label})`;
    const assessmentLine = candidate.completedCount === 4 
      ? 'Completed all 4 assessments'
      : `Completed ${candidate.completedCount}/4 assessments (${candidate.completedAssessments.join(', ')})`;
    const strengthsLine = `Key Strengths: ${candidate.topSkills.map(s => s.name).join(', ')}`;
    
    const strengthsLines = pdf.splitTextToSize(strengthsLine, pageWidth - 70);
    const boxHeight = 28 + (strengthsLines.length - 1) * 5;
    
    yPos = ensurePageSpace(pdf, yPos, boxHeight + 8, pageHeight, pageWidth);
    
    // Draw box with light background and colored outline only
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(20, yPos, pageWidth - 40, boxHeight, 2, 2, 'FD');
    
    const textStartX = 26;
    let textY = yPos + 6;
    
    // Candidate name
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(candidate.name, textStartX, textY);
    textY += 6;
    
    // Composite score line
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text(scoreLine, textStartX, textY);
    textY += 5;
    
    // Assessments completed line
    pdf.setTextColor(107, 114, 128);
    pdf.text(assessmentLine, textStartX, textY);
    textY += 5;
    
    // Key strengths (may wrap)
    pdf.setTextColor(55, 65, 81);
    strengthsLines.forEach((line: string) => {
      pdf.text(line, textStartX, textY);
      textY += 5;
    });
    
    yPos += boxHeight + 6; // Space between boxes
  });
  
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
  const baseCardHeight = 35;
  
  // Pre-calculate role description lines to determine dynamic height
  let descLines: string[] = [];
  let finalCardHeight = baseCardHeight;
  if (data.role.description) {
    pdf.setFontSize(7);
    descLines = pdf.splitTextToSize(data.role.description, cardWidth - 10);
    const maxDescLines = Math.min(descLines.length, 3);
    finalCardHeight = Math.max(baseCardHeight, 28 + (maxDescLines * 3));
  }
  
  // Card 1: Candidate (left) - uses finalCardHeight
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, cardWidth, finalCardHeight, 2, 2, 'FD');
  
  applyLabelText(pdf);
  pdf.text('CANDIDATE', 25, yPos + 8);
  
  applySubheading(pdf);
  pdf.setTextColor(17, 24, 39);
  const truncatedName = candidateName.length > 20 ? candidateName.substring(0, 18) + '...' : candidateName;
  pdf.text(truncatedName, 25, yPos + 17);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  // Allow email to wrap to two lines if needed
  const emailLines = pdf.splitTextToSize(data.candidate.user.email, cardWidth - 10);
  const displayEmailLines = emailLines.slice(0, 2); // Max 2 lines
  displayEmailLines.forEach((line: string, idx: number) => {
    pdf.text(line, 25, yPos + 24 + (idx * 3));
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
  const truncatedRole = data.role.name.length > 22 ? data.role.name.substring(0, 20) + '...' : data.role.name;
  pdf.text(truncatedRole, roleX + 5, yPos + 17);
  
  if (data.role.description && descLines.length > 0) {
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const displayLines = descLines.slice(0, 3);
    displayLines.forEach((line: string, idx: number) => {
      pdf.text(line, roleX + 5, yPos + 23 + (idx * 3));
    });
  }
  
  // Card 3: Overall Fit Score (right) - uses finalCardHeight
  const fitColor = data.alignment.overallFit >= 80 ? [34, 197, 94] : 
                   data.alignment.overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = data.alignment.overallFit >= 80 ? 'Excellent Fit' : 
                   data.alignment.overallFit >= 60 ? 'Good Fit' : 'Needs Development';
  
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
  pdf.text(`${data.alignment.overallFit}%`, fitX + 5, yPos + 22);
  
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
  
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Areas where the candidate exceeds role requirements and demonstrates strong capability', 20, yPos);
  yPos += 6;
  
  // Use text descriptions from alignment.strengths
  const strengthDescriptions = data.alignment.strengths?.slice(0, 6) || [];
  
  // Two-column grid of individual boxes
  const itemBoxWidth = (pageWidth - 45) / 2;
  const itemBoxGap = 5;
  let strengthLeftY = yPos;
  let strengthRightY = yPos;
  
  strengthDescriptions.forEach((strength: string, index: number) => {
    const isLeftCol = index % 2 === 0;
    const boxX = isLeftCol ? 20 : 20 + itemBoxWidth + itemBoxGap;
    const currentY = isLeftCol ? strengthLeftY : strengthRightY;
    
    // Calculate box height based on text content
    pdf.setFontSize(8);
    const wrappedLines = pdf.splitTextToSize(strength, itemBoxWidth - 8);
    const boxHeight = Math.max(12, wrappedLines.length * 3.5 + 6);
    
    // Draw individual box with subtle green styling
    pdf.setFillColor(250, 255, 250); // Very light green
    pdf.setDrawColor(134, 197, 134); // Subtle green border
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, currentY, itemBoxWidth, boxHeight, 2, 2, 'FD');
    
    // Strength description text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(34, 84, 52); // Dark green text
    wrappedLines.forEach((line: string, lineIndex: number) => {
      pdf.text(line, boxX + 4, currentY + 5 + (lineIndex * 3.5));
    });
    
    // Update column Y position
    if (isLeftCol) {
      strengthLeftY = currentY + boxHeight + 3;
    } else {
      strengthRightY = currentY + boxHeight + 3;
    }
  });
  
  yPos = Math.max(strengthLeftY, strengthRightY) + 3;
  pdf.setTextColor(0, 0, 0);
  
  // ========== DEVELOPMENT AREAS (text descriptions) ==========
  yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Skill gaps requiring targeted development to meet role requirements', 20, yPos);
  yPos += 6;
  
  // Use text descriptions from alignment.gaps
  const gapDescriptions = data.alignment.gaps?.slice(0, 6) || [];
  
  let gapLeftY = yPos;
  let gapRightY = yPos;
  
  gapDescriptions.forEach((gap: string, index: number) => {
    const isLeftCol = index % 2 === 0;
    const boxX = isLeftCol ? 20 : 20 + itemBoxWidth + itemBoxGap;
    const currentY = isLeftCol ? gapLeftY : gapRightY;
    
    // Calculate box height based on text content
    pdf.setFontSize(8);
    const wrappedLines = pdf.splitTextToSize(gap, itemBoxWidth - 8);
    const boxHeight = Math.max(12, wrappedLines.length * 3.5 + 6);
    
    // Draw individual box with subtle amber styling
    pdf.setFillColor(255, 253, 245); // Very light amber
    pdf.setDrawColor(210, 180, 100); // Subtle amber border
    pdf.setLineWidth(0.3);
    pdf.roundedRect(boxX, currentY, itemBoxWidth, boxHeight, 2, 2, 'FD');
    
    // Gap description text
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(130, 90, 20); // Dark amber text
    wrappedLines.forEach((line: string, lineIndex: number) => {
      pdf.text(line, boxX + 4, currentY + 5 + (lineIndex * 3.5));
    });
    
    // Update column Y position
    if (isLeftCol) {
      gapLeftY = currentY + boxHeight + 3;
    } else {
      gapRightY = currentY + boxHeight + 3;
    }
  });
  
  yPos = Math.max(gapLeftY, gapRightY) + 3;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILL ALIGNMENT ANALYSIS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 32;
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Detailed comparison of candidate skills against role requirements from FIT and AI Readiness assessments', 20, yPos);
  yPos += 10;
  
  // Helper function to render skill line chart
  const renderSkillSection = (skills: any[], sectionTitle: string, iconColor: [number, number, number]) => {
    if (!skills || skills.length === 0) return;
    
    // Section title with icon
    applySubheading(pdf);
    pdf.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
    pdf.text(sectionTitle, 20, yPos);
    yPos += 7;
    
    // Line chart dimensions - increased left margin for skill labels
    const chartMarginLeft = 55;
    const chartWidth = pageWidth - 75;
    const chartHeight = Math.min(skills.length * 8, 80); // Max 80mm height
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
      
      // Skill label on left with prominent criticality indicator
      const criticality = skill.criticality || 'important';
      const isCriticalGap = criticality === 'critical' && skill.gap > 0;
      const skillName = skill.skillName.length > 18 ? skill.skillName.substring(0, 16) + '...' : skill.skillName;
      
      // Draw criticality indicator - only show CRITICAL badges (simplified per user request)
      if (criticality === 'critical') {
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
  
  // Add spacing between sections
  yPos += 6;
  
  // Render AI Readiness skills if available
  if (data.alignment.aiReadinessSkillAlignments && data.alignment.aiReadinessSkillAlignments.length > 0) {
    renderSkillSection(data.alignment.aiReadinessSkillAlignments, 'AI READINESS SKILLS (Technical)', [59, 130, 246]);
  }
  
  // ========== CRITICAL SKILLS ANALYSIS ==========
  // Get all critical skills from both FIT and AI Readiness alignments (up to 6)
  // Prioritize by: 1) criticality='critical', 2) largest gaps (most need for development)
  const allSkillsWithSource = [
    ...(data.alignment.fitSkillAlignments || []).map(s => ({ ...s, source: 'fit' as const })),
    ...(data.alignment.aiReadinessSkillAlignments || []).map(s => ({ ...s, source: 'ai' as const }))
  ];
  const criticalSkills = allSkillsWithSource
    .filter(skill => skill.criticality === 'critical')
    .sort((a, b) => {
      // Sort by gap (descending) - larger gaps first for priority
      const gapA = a.requiredScore - a.candidateScore;
      const gapB = b.requiredScore - b.candidateScore;
      return gapB - gapA;
    })
    .slice(0, 6);
  
  if (criticalSkills.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Deep analysis of the most critical skills required for this role', 20, yPos);
    yPos += 8;
    
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
        const gap = skill.candidateScore - skill.requiredScore;
        const gapColor: [number, number, number] = gap >= 0 ? [34, 197, 94] : [239, 68, 68];
        const gapText = gap >= 0 ? `+${gap} above requirement` : `${Math.abs(gap)} below requirement`;
        
        pdf.text(`Candidate Score: `, 25, yPos);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${skill.candidateScore}/100`, 60, yPos);
        pdf.setFont('helvetica', 'normal');
        pdf.text(` (Recommended: ${skill.requiredScore})`, 75, yPos);
        
        pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
        pdf.text(` ${gapText}`, 115, yPos);
      }
      
      yPos += 8;
    });
    
    // Overall critical skills analysis
    yPos = ensurePageSpace(pdf, yPos, 20, pageHeight, pageWidth);
    yPos += 2;
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    
    const criticalMet = criticalSkills.filter(s => s.candidateScore >= s.requiredScore).length;
    const criticalTotal = criticalSkills.length;
    const criticalPercentage = Math.round((criticalMet / criticalTotal) * 100);
    
    let overallAnalysis = '';
    if (criticalPercentage >= 75) {
      overallAnalysis = `${candidateName} demonstrates strong alignment with critical role requirements, meeting ${criticalMet} of ${criticalTotal} critical skills. This indicates readiness to perform core role functions with minimal additional development needed.`;
    } else if (criticalPercentage >= 50) {
      overallAnalysis = `${candidateName} shows moderate alignment with critical skills, meeting ${criticalMet} of ${criticalTotal} key requirements. Targeted development in the remaining critical areas would strengthen role performance significantly.`;
    } else {
      overallAnalysis = `${candidateName} requires development in ${criticalTotal - criticalMet} of ${criticalTotal} critical skills. These gaps should be addressed through structured training before full role responsibilities are assumed.`;
    }
    
    // Calculate box height based on text
    const analysisLines = pdf.splitTextToSize(overallAnalysis, pageWidth - 55);
    const boxHeight = Math.max(15, analysisLines.length * 4 + 8);
    
    pdf.roundedRect(20, yPos, pageWidth - 40, boxHeight, 2, 2, 'FD');
    yPos += 5;
    
    applySubheading(pdf);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Critical Skills Summary', 25, yPos);
    yPos += 5;
    
    applyBodyText(pdf);
    pdf.setTextColor(55, 65, 81);
    analysisLines.forEach((line: string) => {
      pdf.text(line, 25, yPos);
      yPos += 4;
    });
    
    yPos += 8;
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
    
    yPos = addSectionHeader(pdf, 'COHORT BENCHMARKING', yPos, pageWidth);
    yPos += 2;
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Candidate's performance compared to other candidates in the cohort", 20, yPos);
    yPos += 8;
    
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
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Alternative roles this candidate might be suitable for (requires 50%+ skill coverage)', 20, yPos);
    yPos += 8;
    
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
  
  // ========== FINAL RECOMMENDATION ==========
  yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
  yPos += PDF_SPACING.large;
  
  yPos = addSectionHeader(pdf, 'FINAL RECOMMENDATION', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.setTextColor(107, 114, 128);
  pdf.text('AI-generated hiring guidance based on comprehensive assessment analysis', 20, yPos);
  yPos += PDF_SPACING.large; // Extra spacing between description and content
  
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
    .replace(/\n{3,}/g, '\n\n') // Clean up extra newlines
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
      criticality: 'critical' | 'important' | 'nice-to-have';
      category: 'fit' | 'ai_readiness';
      dataAvailable?: boolean;
    }>;
    strengths: string[];
    gaps: string[];
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
}

export async function exportMultiCandidateComparisonPDF(data: MultiCandidateComparisonData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  // ========== PAGE 1: HOW TO READ THIS REPORT (FIRST) ==========
  addReportGuidePage(pdf, pageWidth, pageHeight, 'multi-candidate');
  
  // ========== PAGE 2: SUMMARY DASHBOARD ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section with blue background
  yPos = 35;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 28, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MULTI-CANDIDATE ROLE FIT COMPARISON', pageWidth / 2, yPos + 10, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Target Role: ${data.roleSnapshot.roleName}`, pageWidth / 2, yPos + 18, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.text(`Generated: ${new Date().toLocaleDateString()} | ${data.candidateEntries.length} Candidates`, pageWidth / 2, yPos + 24, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 70;
  
  // ========== UNIFORM TYPOGRAPHY CONSTANTS ==========
  const LABEL_SIZE = 8;
  const VALUE_SIZE = 12;
  const BODY_SIZE = 8;
  const CARD_PADDING = 6;
  const BLOCK_SPACING = 12;
  const ITEM_SPACING = 4;
  
  // Summary Cards (3 cards: Top Performer, Candidates Assessed, Distribution) - Uniform styling
  const cardWidth = (pageWidth - 50) / 3;
  const cardHeight = 32;
  const cardGap = 5;
  
  // Card 1: Top Performer - All blue shades
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(20, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  pdf.setFontSize(LABEL_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('TOP PERFORMER', 20 + CARD_PADDING, yPos + CARD_PADDING + 2);
  // Null-safety for topPerformer
  const topPerformerName = String(data.summaryInsights.topPerformer?.userName || 'N/A');
  const topPerformerFitVal = data.summaryInsights.topPerformer?.overallFit ?? 0;
  const topName = topPerformerName.length > 20 
    ? topPerformerName.slice(0, 18) + '...' 
    : topPerformerName;
  pdf.setFontSize(VALUE_SIZE - 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(topName, 20 + CARD_PADDING, yPos + CARD_PADDING + 13);
  pdf.setFontSize(VALUE_SIZE + 4);
  pdf.setTextColor(37, 99, 235);
  pdf.text(`${topPerformerFitVal}%`, 20 + CARD_PADDING, yPos + CARD_PADDING + 24);
  
  // Card 2: Candidates Assessed - Blue shades
  const card2X = 20 + cardWidth + cardGap;
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(59, 130, 246);
  pdf.roundedRect(card2X, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  pdf.setFontSize(LABEL_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('CANDIDATES ASSESSED', card2X + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFontSize(VALUE_SIZE + 6);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 64, 175);
  pdf.text(`${data.candidateEntries.length}`, card2X + CARD_PADDING, yPos + CARD_PADDING + 20);
  
  // Card 3: Distribution - Blue shades with colored indicators
  const card3X = card2X + cardWidth + cardGap;
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(59, 130, 246);
  pdf.roundedRect(card3X, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  pdf.setFontSize(LABEL_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('FIT DISTRIBUTION', card3X + CARD_PADDING, yPos + CARD_PADDING + 2);
  
  // Distribution with colored circles and better layout
  const distY = yPos + CARD_PADDING + 12;
  const distSpacing = (cardWidth - CARD_PADDING * 2) / 3;
  
  // Strong (green circle)
  pdf.setFillColor(34, 197, 94);
  pdf.circle(card3X + CARD_PADDING + 3, distY, 2, 'F');
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text(`${data.summaryInsights.fitDistribution.strong}`, card3X + CARD_PADDING + 8, distY + 1);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('Strong', card3X + CARD_PADDING + 1, distY + 8);
  
  // Moderate (amber circle)
  const modX = card3X + CARD_PADDING + distSpacing;
  pdf.setFillColor(234, 179, 8);
  pdf.circle(modX + 3, distY, 2, 'F');
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(234, 179, 8);
  pdf.text(`${data.summaryInsights.fitDistribution.moderate}`, modX + 8, distY + 1);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('Moderate', modX, distY + 8);
  
  // Dev Needed (red circle)
  const devX = card3X + CARD_PADDING + distSpacing * 2;
  pdf.setFillColor(239, 68, 68);
  pdf.circle(devX + 3, distY, 2, 'F');
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(239, 68, 68);
  pdf.text(`${data.summaryInsights.fitDistribution.developmentNeeded}`, devX + 8, distY + 1);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6);
  pdf.text('Develop', devX + 1, distY + 8);
  
  pdf.setTextColor(0, 0, 0);
  yPos += cardHeight + BLOCK_SPACING;
  
  // ========== COHORT INSIGHTS - Uniform styling ==========
  yPos = addSectionHeader(pdf, 'COHORT INSIGHTS', yPos, pageWidth);
  yPos += CARD_PADDING;
  
  const halfWidth = (pageWidth - 50) / 2;
  const insightBoxHeight = 38;
  
  // Common Strengths
  pdf.setFillColor(236, 253, 245);
  pdf.setDrawColor(134, 239, 172);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(20, yPos, halfWidth, insightBoxHeight, 2, 2, 'FD');
  pdf.setFontSize(BODY_SIZE + 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('Common Strengths', 20 + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(BODY_SIZE);
  pdf.setTextColor(22, 101, 52);
  if (data.summaryInsights.commonStrengths.length > 0) {
    data.summaryInsights.commonStrengths.slice(0, 4).forEach((s, i) => {
      const truncated = s.length > 35 ? s.slice(0, 33) + '...' : s;
      pdf.text(`\u2022 ${truncated}`, 20 + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 6));
    });
  } else {
    pdf.text('No common strengths identified', 20 + CARD_PADDING, yPos + CARD_PADDING + 12);
  }
  
  // Common Gaps
  pdf.setFillColor(254, 252, 232);
  pdf.setDrawColor(253, 224, 71);
  pdf.roundedRect(25 + halfWidth, yPos, halfWidth, insightBoxHeight, 2, 2, 'FD');
  pdf.setFontSize(BODY_SIZE + 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(161, 98, 7);
  pdf.text('Common Development Areas', 25 + halfWidth + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(BODY_SIZE);
  pdf.setTextColor(133, 77, 14);
  if (data.summaryInsights.commonGaps.length > 0) {
    data.summaryInsights.commonGaps.slice(0, 4).forEach((g, i) => {
      const truncated = g.length > 35 ? g.slice(0, 33) + '...' : g;
      pdf.text(`\u2022 ${truncated}`, 25 + halfWidth + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 6));
    });
  } else {
    pdf.text('No common gaps identified', 25 + halfWidth + CARD_PADDING, yPos + CARD_PADDING + 12);
  }
  
  yPos += insightBoxHeight + BLOCK_SPACING;
  
  // Key Differentiators
  if (data.summaryInsights.keyDifferentiators.length > 0) {
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(147, 197, 253);
    pdf.roundedRect(20, yPos, pageWidth - 40, 26, 2, 2, 'FD');
    pdf.setFontSize(BODY_SIZE + 1);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Key Differentiators', 20 + CARD_PADDING, yPos + CARD_PADDING + 2);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(BODY_SIZE);
    pdf.setTextColor(30, 64, 175);
    data.summaryInsights.keyDifferentiators.slice(0, 3).forEach((d, i) => {
      const truncated = d.length > 90 ? d.slice(0, 88) + '...' : d;
      pdf.text(`\u2022 ${truncated}`, 20 + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 5));
    });
    yPos += 26 + BLOCK_SPACING;
  }
  
  // AI Hiring Suggestions Box
  pdf.setFillColor(250, 245, 255);
  pdf.setDrawColor(196, 181, 253);
  pdf.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, 'FD');
  pdf.setFontSize(BODY_SIZE + 1);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(124, 58, 237);
  pdf.text('AI Hiring Suggestions', 20 + CARD_PADDING, yPos + CARD_PADDING + 2);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(BODY_SIZE);
  pdf.setTextColor(91, 33, 182);
  
  // Generate contextual AI suggestions based on data (with null-safety)
  const strongCount = data.summaryInsights.fitDistribution?.strong ?? 0;
  const topPerformerFit = data.summaryInsights.topPerformer?.overallFit ?? 0;
  
  const aiSuggestions: string[] = [];
  if (strongCount >= 2) {
    aiSuggestions.push(`${strongCount} candidates show strong fit (80%+). Prioritize interviews for top performers.`);
  } else if (strongCount === 1) {
    aiSuggestions.push(`Only 1 candidate shows strong fit. Consider expanding candidate pool.`);
  } else {
    aiSuggestions.push(`No candidates meet 80% threshold. Review role requirements or source more.`);
  }
  
  if (topPerformerFit >= 85) {
    aiSuggestions.push(`Top performer (${topPerformerFit}%) is excellent match. Fast-track to final stage.`);
  } else if (topPerformerFit >= 70) {
    aiSuggestions.push(`Top performer (${topPerformerFit}%) shows good potential with targeted development.`);
  }
  
  if (data.summaryInsights.commonGaps.length > 0) {
    aiSuggestions.push(`Common gap: Consider training for "${data.summaryInsights.commonGaps[0]}".`);
  }
  
  aiSuggestions.slice(0, 3).forEach((suggestion, i) => {
    const truncated = suggestion.length > 95 ? suggestion.slice(0, 93) + '...' : suggestion;
    pdf.text(`\u2022 ${truncated}`, 20 + CARD_PADDING, yPos + CARD_PADDING + 10 + (i * 6));
  });
  
  // ========== OVERALL FIT COMPARISON - NEW PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 35;
  
  // Bar Chart Image (if provided)
  if (data.barChartImage) {
    yPos = addSectionHeader(pdf, 'OVERALL FIT COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Visual comparison of role fit scores across all candidates', 20, yPos);
    yPos += 8;
    
    try {
      // Smaller chart height for compact bars
      const chartHeight = Math.min(45, pageHeight - yPos - 40);
      pdf.addImage(data.barChartImage, 'PNG', 20, yPos, pageWidth - 40, chartHeight);
      yPos += chartHeight + 15;
    } catch (e) {
      console.error('Error adding bar chart image:', e);
    }
  }
  
  // ========== ADVANCED ANALYTICS SECTION ==========
  yPos = addSectionHeader(pdf, 'ADVANCED ANALYTICS', yPos, pageWidth);
  yPos += 8;
  
  const analyticsBoxWidth = (pageWidth - 50) / 2;
  const analyticsBoxHeight = 50;
  
  // Skill Dominance (left box)
  if (data.summaryInsights.skillDominance && data.summaryInsights.skillDominance.length > 0) {
    pdf.setFillColor(255, 251, 235);
    pdf.setDrawColor(251, 191, 36);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(20, yPos, analyticsBoxWidth, analyticsBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(180, 83, 9);
    pdf.text('Skill Dominance Count', 26, yPos + 10);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(113, 63, 18);
    pdf.text('How many skills each candidate leads in', 26, yPos + 16);
    
    pdf.setFontSize(8);
    data.summaryInsights.skillDominance.slice(0, 4).forEach((sd: any, i: number) => {
      if (!sd || !sd.candidateName) return;
      const candidateName = String(sd.candidateName || 'Unknown');
      const truncName = candidateName.length > 18 ? candidateName.slice(0, 16) + '...' : candidateName;
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${truncName}`, 26, yPos + 24 + (i * 6));
      pdf.setTextColor(180, 83, 9);
      pdf.text(`${sd.winsCount ?? 0}/${sd.totalSkills ?? 0} skills`, 26 + analyticsBoxWidth - 35, yPos + 24 + (i * 6));
    });
  }
  
  // Consistency Scores (right box)
  if (data.summaryInsights.consistencyScores && data.summaryInsights.consistencyScores.length > 0) {
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(59, 130, 246);
    pdf.roundedRect(25 + analyticsBoxWidth, yPos, analyticsBoxWidth, analyticsBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(30, 64, 175);
    pdf.text('Consistency Score', 31 + analyticsBoxWidth, yPos + 10);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Score uniformity across assessments', 31 + analyticsBoxWidth, yPos + 16);
    
    pdf.setFontSize(8);
    data.summaryInsights.consistencyScores.slice(0, 4).forEach((cs: any, i: number) => {
      if (!cs || !cs.candidateName) return;
      const candidateName = String(cs.candidateName || 'Unknown');
      const truncName = candidateName.length > 15 ? candidateName.slice(0, 13) + '...' : candidateName;
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${truncName}`, 31 + analyticsBoxWidth, yPos + 24 + (i * 6));
      const interpretation = String(cs.interpretation || 'N/A');
      const interpColor = interpretation === 'Excellent' ? [34, 197, 94] : 
                          interpretation === 'Good' ? [59, 130, 246] : [234, 179, 8];
      pdf.setTextColor(interpColor[0], interpColor[1], interpColor[2]);
      pdf.text(`${cs.consistencyScore ?? 0}% ${interpretation}`, 31 + (2 * analyticsBoxWidth) - 35, yPos + 24 + (i * 6));
    });
  }
  
  yPos += analyticsBoxHeight + 10;
  
  // Critical Gap Ratio (full width box)
  if (data.summaryInsights.criticalGapRatios && data.summaryInsights.criticalGapRatios.length > 0) {
    const gapBoxHeight = 35;
    pdf.setFillColor(254, 242, 242);
    pdf.setDrawColor(239, 68, 68);
    pdf.roundedRect(20, yPos, pageWidth - 40, gapBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(153, 27, 27);
    pdf.text('Critical Gap Analysis', 26, yPos + 10);
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(185, 28, 28);
    pdf.text('How many critical skills each candidate is below threshold on', 26, yPos + 16);
    
    const gapColWidth = (pageWidth - 50) / Math.min(4, data.summaryInsights.criticalGapRatios.length);
    data.summaryInsights.criticalGapRatios.slice(0, 4).forEach((cgr: any, i: number) => {
      if (!cgr || !cgr.candidateName) return;
      const colX = 26 + (i * gapColWidth);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      const candidateName = String(cgr.candidateName || 'Unknown');
      const truncName = candidateName.length > 12 ? candidateName.slice(0, 10) + '...' : candidateName;
      pdf.text(truncName, colX, yPos + 24);
      pdf.setFont('helvetica', 'normal');
      const riskLevel = String(cgr.riskLevel || 'Unknown');
      const riskColor = riskLevel === 'No Risk' ? [34, 197, 94] :
                        riskLevel === 'Low Risk' ? [59, 130, 246] :
                        riskLevel === 'Moderate Risk' ? [234, 179, 8] : [239, 68, 68];
      pdf.setTextColor(riskColor[0], riskColor[1], riskColor[2]);
      pdf.text(`${cgr.criticalGaps ?? 0}/${cgr.totalCritical ?? 0} gaps - ${riskLevel}`, colX, yPos + 30);
    });
    
    yPos += gapBoxHeight + 10;
  }
  
  // Largest Differential (if available)
  if (data.summaryInsights.largestDifferential) {
    const diff = data.summaryInsights.largestDifferential;
    // Guard against missing properties
    if (diff.skillName && diff.topCandidate && diff.bottomCandidate) {
      const diffBoxHeight = 22;
      pdf.setFillColor(240, 253, 244);
      pdf.setDrawColor(34, 197, 94);
      pdf.roundedRect(20, yPos, pageWidth - 40, diffBoxHeight, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(22, 101, 52);
      pdf.text('Largest Skill Differential', 26, yPos + 8);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(21, 128, 61);
      const topScore = diff.topScore ?? 0;
      const bottomScore = diff.bottomScore ?? 0;
      const diffText = `${diff.skillName}: ${diff.topCandidate} (${topScore}) leads ${diff.bottomCandidate} (${bottomScore}) by ${topScore - bottomScore} points`;
      pdf.text(diffText, 26, yPos + 16);
      
      yPos += diffBoxHeight + 10;
    }
  }
  
  // ========== CANDIDATE RANKINGS PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 35;
  
  yPos = addSectionHeader(pdf, 'CANDIDATE RANKINGS', yPos, pageWidth);
  yPos += 5;
  
  // Table header
  const colWidths = { rank: 15, name: 55, fit: 25, tier: 30, strengths: 35, gaps: 30 };
  const tableX = 20;
  
  pdf.setFillColor(249, 250, 251);
  pdf.rect(tableX, yPos, pageWidth - 40, 8, 'F');
  
  applyLabelText(pdf);
  pdf.text('RANK', tableX + 2, yPos + 5);
  pdf.text('CANDIDATE', tableX + colWidths.rank + 2, yPos + 5);
  pdf.text('FIT %', tableX + colWidths.rank + colWidths.name + 2, yPos + 5);
  pdf.text('TIER', tableX + colWidths.rank + colWidths.name + colWidths.fit + 2, yPos + 5);
  pdf.text('KEY NOTES', tableX + colWidths.rank + colWidths.name + colWidths.fit + colWidths.tier + 2, yPos + 5);
  
  yPos += 10;
  
  // Table rows
  data.candidateEntries.forEach((candidate, idx) => {
    // Check page break
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const rowHeight = 16;
    
    // Alternating row background
    if (idx % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(tableX, yPos - 2, pageWidth - 40, rowHeight, 'F');
    }
    
    // Rank with medal for top 3
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    if (idx === 0) {
      pdf.setTextColor(234, 179, 8); // Gold
    } else if (idx === 1) {
      pdf.setTextColor(156, 163, 175); // Silver
    } else if (idx === 2) {
      pdf.setTextColor(180, 83, 9); // Bronze
    } else {
      pdf.setTextColor(107, 114, 128);
    }
    pdf.text(`${candidate.rank}`, tableX + 5, yPos + 5);
    
    // Name and email
    pdf.setTextColor(17, 24, 39);
    pdf.setFont('helvetica', 'bold');
    const truncName = candidate.userName.length > 22 ? candidate.userName.slice(0, 20) + '...' : candidate.userName;
    pdf.text(truncName, tableX + colWidths.rank + 2, yPos + 4);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    const truncEmail = candidate.email.length > 30 ? candidate.email.slice(0, 28) + '...' : candidate.email;
    pdf.text(truncEmail, tableX + colWidths.rank + 2, yPos + 10);
    
    // Fit percentage
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    const fitColor = candidate.fitTier === 'strong' ? [34, 197, 94] : 
                     candidate.fitTier === 'moderate' ? [234, 179, 8] : [239, 68, 68];
    pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
    pdf.text(`${candidate.overallFit}%`, tableX + colWidths.rank + colWidths.name + 2, yPos + 6);
    
    // Tier badge
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    const tierLabel = candidate.fitTier === 'strong' ? 'Strong' : 
                      candidate.fitTier === 'moderate' ? 'Moderate' : 'Dev Needed';
    pdf.text(tierLabel, tableX + colWidths.rank + colWidths.name + colWidths.fit + 2, yPos + 6);
    
    // Key notes (strengths or gaps)
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const notes = candidate.riskFlags.length > 0 
      ? candidate.riskFlags[0] 
      : candidate.strengths.length > 0 
        ? candidate.strengths[0].replace('Strong ', '')
        : '';
    const truncNotes = notes.length > 25 ? notes.slice(0, 23) + '...' : notes;
    pdf.text(truncNotes, tableX + colWidths.rank + colWidths.name + colWidths.fit + colWidths.tier + 2, yPos + 6);
    
    yPos += rowHeight;
  });
  
  // ========== CRITICAL SKILLS DASHBOARD TABLE ==========
  // Extract critical skills from role snapshot
  const roleSkills = data.roleSnapshot.requiredSkillScores;
  const skillCriticality = roleSkills?.skillCriticality || {};
  
  // Build critical skill list with required scores
  const criticalSkillsWithRequirements: Array<{ skillName: string; requiredScore: number; category: 'fit' | 'ai_readiness' }> = [];
  
  if (roleSkills?.fitSkills) {
    Object.entries(roleSkills.fitSkills).forEach(([skillName, requiredScore]) => {
      if (skillCriticality[skillName] === 'critical') {
        criticalSkillsWithRequirements.push({ skillName, requiredScore: requiredScore as number, category: 'fit' });
      }
    });
  }
  if (roleSkills?.aiReadinessSkills) {
    Object.entries(roleSkills.aiReadinessSkills).forEach(([skillName, requiredScore]) => {
      if (skillCriticality[skillName] === 'critical') {
        criticalSkillsWithRequirements.push({ skillName, requiredScore: requiredScore as number, category: 'ai_readiness' });
      }
    });
  }
  
  if (criticalSkillsWithRequirements.length > 0) {
    // Check page space - need new page for critical skills table
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;
    
    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS DASHBOARD', yPos, pageWidth);
    yPos += 3;
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Must-have skills for this role. Candidates must meet thresholds (60+) on these skills.', 20, yPos);
    yPos += 8;
    
    // Sort candidates by rank
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
    
    // Calculate column widths dynamically
    const candidateCount = Math.min(sortedCandidates.length, 5); // Max 5 candidates in table
    const skillColWidth = 50;
    const reqColWidth = 18;
    const candidateColWidth = (pageWidth - 40 - skillColWidth - reqColWidth) / candidateCount;
    
    // Table header
    pdf.setFillColor(254, 226, 226);
    pdf.rect(20, yPos, pageWidth - 40, 12, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(127, 29, 29);
    pdf.text('Critical Skill', 22, yPos + 8);
    pdf.text('Req', 20 + skillColWidth + 2, yPos + 8);
    
    sortedCandidates.slice(0, candidateCount).forEach((candidateForHeader, idx) => {
      const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);
      const name = candidateForHeader.userName.split(' ')[0];
      const truncName = name.length > 10 ? name.slice(0, 9) + '.' : name;
      
      // Highlight top candidate
      if (idx === 0 && candidateForHeader.overallFit != null) {
        pdf.setFillColor(220, 252, 231);
        pdf.rect(colX, yPos, candidateColWidth, 12, 'F');
      }
      
      pdf.setTextColor(17, 24, 39);
      pdf.text(truncName, colX + 2, yPos + 8);
    });
    
    yPos += 14;
    
    // Table rows for each critical skill
    criticalSkillsWithRequirements.forEach((criticalSkill, skillIdx) => {
      if (yPos > pageHeight - 25) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Alternating row background
      if (skillIdx % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
      }
      
      // Skill name
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const skillNameTrunc = criticalSkill.skillName.length > 25 ? criticalSkill.skillName.slice(0, 23) + '...' : criticalSkill.skillName;
      pdf.text(skillNameTrunc, 22, yPos + 5);
      
      // Required score
      pdf.setTextColor(220, 38, 38);
      pdf.text(`${criticalSkill.requiredScore}+`, 20 + skillColWidth + 2, yPos + 5);
      
      // Each candidate's score
      sortedCandidates.slice(0, candidateCount).forEach((candidateForRow, idx) => {
        const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);
        const skill = findSkillInScores(candidateForRow.skillScores, criticalSkill.skillName);
        const hasData = skill?.dataAvailable !== false && skill?.score != null;
        const score = skill?.score || 0;
        const meetsRequired = hasData && score >= criticalSkill.requiredScore;
        const meetsThreshold = hasData && score >= 60;
        
        // Highlight top candidate column
        if (idx === 0 && candidateForRow.overallFit != null) {
          pdf.setFillColor(236, 253, 245);
          pdf.rect(colX, yPos - 3, candidateColWidth, 12, 'F');
        }
        
        if (!hasData) {
          pdf.setTextColor(156, 163, 175);
          pdf.setFont('helvetica', 'italic');
          pdf.text('N/A', colX + 2, yPos + 5);
          pdf.setFont('helvetica', 'normal');
        } else {
          // Score with color coding
          const scoreColor = meetsRequired ? [34, 197, 94] : meetsThreshold ? [234, 179, 8] : [239, 68, 68];
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
          pdf.text(`${score}`, colX + 2, yPos + 5);
          
          // Status indicator
          const indicator = meetsRequired ? '\u2713' : meetsThreshold ? '~' : '\u2717';
          pdf.text(indicator, colX + candidateColWidth - 12, yPos + 5);
          pdf.setFont('helvetica', 'normal');
        }
      });
      
      yPos += 12;
    });
    
    // Footer row: Critical Skills Met
    pdf.setFillColor(229, 231, 235);
    pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Critical Skills Met', 22, yPos + 5);
    pdf.text('—', 20 + skillColWidth + 2, yPos + 5);
    
    sortedCandidates.slice(0, candidateCount).forEach((candidateForFooter, idx) => {
      const colX = 20 + skillColWidth + reqColWidth + (idx * candidateColWidth);
      
      const criticalSkillsMet = criticalSkillsWithRequirements.filter(cs => {
        const skill = findSkillInScores(candidateForFooter.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
      }).length;
      
      const assessedCritical = criticalSkillsWithRequirements.filter(cs => {
        const skill = findSkillInScores(candidateForFooter.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null;
      }).length;
      
      if (assessedCritical === 0) {
        pdf.setTextColor(156, 163, 175);
        pdf.text('No data', colX + 2, yPos + 5);
      } else {
        const allMet = criticalSkillsMet === criticalSkillsWithRequirements.length;
        pdf.setTextColor(allMet ? 34 : 239, allMet ? 197 : 68, allMet ? 94 : 68);
        pdf.text(`${criticalSkillsMet}/${assessedCritical}`, colX + 2, yPos + 5);
      }
    });
    
    yPos += 15;
    
    // Legend
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('\u2713 Meets required  |  ~ Above 60 but below required  |  \u2717 Below 60 threshold', 20, yPos);
    
    // ========== CRITICAL SKILLS DEEP DIVE ==========
    // Explanation of why each critical skill matters
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
    yPos += 3;
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('AI-identified must-have skills for this role with detailed analysis of why each matters', 20, yPos);
    yPos += 10;
    
    criticalSkillsWithRequirements.forEach((criticalSkill, idx) => {
      // Check page space for each skill entry
      if (yPos > pageHeight - 45) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      const skillBoxHeight = 32;
      const description = SKILL_DESCRIPTIONS[criticalSkill.skillName] || `Critical for success in roles requiring ${criticalSkill.skillName.toLowerCase()} capabilities.`;
      
      // Skill box with blue left border
      pdf.setFillColor(239, 246, 255);
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(20, yPos, pageWidth - 40, skillBoxHeight, 2, 2, 'FD');
      
      // Blue left accent bar
      pdf.setFillColor(59, 130, 246);
      pdf.rect(20, yPos, 3, skillBoxHeight, 'F');
      
      // "CRITICAL" badge
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(26, yPos + 4, 25, 6, 1, 1, 'F');
      pdf.setFontSize(5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      pdf.text('CRITICAL', 28, yPos + 8);
      
      // Category badge
      const categoryLabel = criticalSkill.category === 'fit' ? 'Behavioral' : 'Technical';
      pdf.setFillColor(229, 231, 235);
      pdf.roundedRect(54, yPos + 4, 23, 6, 1, 1, 'F');
      pdf.setFontSize(5);
      pdf.setTextColor(75, 85, 99);
      pdf.text(categoryLabel, 56, yPos + 8);
      
      // Skill name and required score
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      pdf.text(criticalSkill.skillName, 26, yPos + 18);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Required: ${criticalSkill.requiredScore}/100`, pageWidth - 55, yPos + 18);
      
      // Why it matters description
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(59, 130, 246);
      const truncDesc = description.length > 110 ? description.slice(0, 108) + '...' : description;
      pdf.text(`Why it matters: ${truncDesc}`, 26, yPos + 27);
      
      yPos += skillBoxHeight + 5;
    });
    
    // Summary of candidates meeting critical skills
    yPos = ensurePageSpace(pdf, yPos, 40, pageHeight, pageWidth);
    yPos += 5;
    
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(34, 197, 94);
    pdf.roundedRect(20, yPos, pageWidth - 40, 30, 2, 2, 'FD');
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(22, 101, 52);
    pdf.text('Critical Skills Summary by Candidate', 26, yPos + 8);
    
    const summaryColWidth = (pageWidth - 50) / Math.min(4, sortedCandidates.length);
    sortedCandidates.slice(0, 4).forEach((candidate, idx) => {
      const colX = 26 + (idx * summaryColWidth);
      
      const criticalMet = criticalSkillsWithRequirements.filter(cs => {
        const skill = findSkillInScores(candidate.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null && (skill.score || 0) >= cs.requiredScore;
      }).length;
      
      const criticalAssessed = criticalSkillsWithRequirements.filter(cs => {
        const skill = findSkillInScores(candidate.skillScores, cs.skillName);
        return skill?.dataAvailable !== false && skill?.score != null;
      }).length;
      
      const percentage = criticalAssessed > 0 ? Math.round((criticalMet / criticalAssessed) * 100) : 0;
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(17, 24, 39);
      const truncName = candidate.userName.length > 15 ? candidate.userName.slice(0, 13) + '...' : candidate.userName;
      pdf.text(truncName, colX, yPos + 15);
      
      const meetColor = percentage >= 75 ? [34, 197, 94] : percentage >= 50 ? [234, 179, 8] : [239, 68, 68];
      pdf.setTextColor(meetColor[0], meetColor[1], meetColor[2]);
      pdf.setFontSize(10);
      pdf.text(`${criticalMet}/${criticalAssessed}`, colX, yPos + 24);
      
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text('skills met', colX + 16, yPos + 24);
    });
    
    yPos += 35;
  }
  
  // ========== HIRING DECISION MATRIX - CANDIDATE CARDS ==========
  yPos = ensurePageSpace(pdf, yPos, 100, pageHeight, pageWidth);
  yPos += 10;
  yPos = addSectionHeader(pdf, 'HIRING DECISION MATRIX', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Individual candidate assessment summary with hiring recommendation', 20, yPos);
  yPos += 10;
  
  // Render candidate-specific decision cards (up to 4 per row, max 8 total)
  const candidateCardWidth = (pageWidth - 50) / Math.min(4, data.candidateEntries.length);
  const candidateCardHeight = 55;
  const maxCandidatesPerRow = 4;
  
  // Sort candidates by fit percentage descending (null-safe)
  const sortedForMatrix = [...data.candidateEntries].sort((a, b) => (b.overallFit ?? 0) - (a.overallFit ?? 0));
  
  sortedForMatrix.slice(0, 8).forEach((candidate, idx) => {
    // Calculate position (new row after 4 candidates)
    const row = Math.floor(idx / maxCandidatesPerRow);
    const col = idx % maxCandidatesPerRow;
    
    // Check page break for second row
    if (row === 1 && col === 0) {
      yPos += candidateCardHeight + 10;
    }
    
    const cardX = 20 + (col * (candidateCardWidth + 3));
    const cardY = yPos;
    
    // Card background based on tier
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
    pdf.roundedRect(cardX, cardY, candidateCardWidth - 3, candidateCardHeight, 2, 2, 'FD');
    
    // Candidate name (with null-safety)
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    const userName = String(candidate.userName || 'Unknown');
    const truncName = userName.length > 14 ? userName.slice(0, 12) + '...' : userName;
    pdf.text(truncName, cardX + 4, cardY + 10);
    
    // Fit percentage (large, with null-safety)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(colors.label[0], colors.label[1], colors.label[2]);
    const fitPercent = candidate.overallFit ?? 0;
    pdf.text(`${fitPercent}%`, cardX + 4, cardY + 24);
    
    // Tier label (with null-safety)
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    const fitTier = candidate.fitTier || 'insufficient-data';
    const tierLabel = fitTier === 'strong' ? 'STRONG FIT' : 
                      fitTier === 'moderate' ? 'MODERATE' : 
                      fitTier === 'insufficient-data' ? 'INSUFFICIENT DATA' : 'DEV NEEDED';
    pdf.text(tierLabel, cardX + 4, cardY + 32);
    
    // Key info
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    
    // Show top strength or main risk (with null-safety guards and fallbacks)
    const strengthsArr = candidate.strengths || [];
    const risksArr = candidate.riskFlags || [];
    const gapsArr = candidate.gaps || [];
    
    // Strength line (or fallback)
    if (strengthsArr.length > 0 && strengthsArr[0]) {
      const strengthText = String(strengthsArr[0]);
      const strength = strengthText.replace('Strong ', '').slice(0, 20);
      pdf.text(`\u2713 ${strength}...`, cardX + 4, cardY + 40);
    } else {
      pdf.setTextColor(156, 163, 175);
      pdf.text('No key strengths identified', cardX + 4, cardY + 40);
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
    }
    
    // Risk/Gap line (or fallback)
    if (risksArr.length > 0 && risksArr[0]) {
      const riskText = String(risksArr[0]);
      const risk = riskText.slice(0, 22);
      pdf.text(`\u26A0 ${risk}...`, cardX + 4, cardY + 47);
    } else if (gapsArr.length > 0 && gapsArr[0]) {
      const gapText = String(gapsArr[0]);
      const gap = gapText.slice(0, 22);
      pdf.text(`Gap: ${gap}...`, cardX + 4, cardY + 47);
    } else {
      pdf.setTextColor(156, 163, 175);
      pdf.text('No critical risks identified', cardX + 4, cardY + 47);
    }
  });
  
  // Adjust yPos after all cards
  const totalRows = Math.ceil(Math.min(8, data.candidateEntries.length) / maxCandidatesPerRow);
  yPos += (candidateCardHeight * totalRows) + 15;
  
  // ========== SKILLS LEGEND PAGE ==========
  // Track the page number where Skills Legend starts
  const legendStartPage = pdf.getNumberOfPages() + 1;
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  // Add footers to all pages using the proper footer function
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    // Show Skills Legend note only on pages before the legend starts
    const isLegendPage = i >= legendStartPage;
    addFooter(pdf, i, totalPages, pageWidth, pageHeight, !isLegendPage);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeRoleName = data.roleSnapshot.roleName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  savePdfMobile(pdf, `multi-candidate-comparison-${safeRoleName}-${timestamp}.pdf`);
}

// Individual Report PDF - Comprehensive format matching sample reports
interface IndividualReportData {
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
  promptData: { totalScore: number; percentile?: number; levels?: Array<{ level: number; totalScore: number }> } | null;
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

export async function generateIndividualReportPDF(data: IndividualReportData) {
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
  const rowBoxHeight = 22; // Same height for all boxes
  const totalWidth = pageWidth - 40; // 20px margin each side
  const gap = 5;
  const profileWidth = totalWidth * 0.4; // Profile takes 40% width
  const metricsWidth = (totalWidth - profileWidth - gap * 2) / 2; // Remaining 60% split into 2 boxes
  
  const completedCount = [data.fitData, data.aiData, data.promptData, data.aiqData].filter(Boolean).length;
  
  // Candidate Profile Box (left)
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, profileWidth, rowBoxHeight, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', 20 + profileWidth / 2, yPos + 7, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  const displayName = data.candidateName.length > 30 ? data.candidateName.substring(0, 27) + '...' : data.candidateName;
  const displayEmail = data.candidate.user.email.length > 35 ? data.candidate.user.email.substring(0, 32) + '...' : data.candidate.user.email;
  pdf.text(`${displayName} | ${displayEmail}`, 20 + profileWidth / 2, yPos + 15, { align: 'center' });
  
  // Key Metrics Boxes (right side - 2 boxes)
  const metricsData = [
    { label: 'Skills Assessed', value: String(skillsAssessed), fontSize: 11 },
    { label: 'Top Skill', value: topSkill.length > 28 ? topSkill.substring(0, 25) + '...' : topSkill, fontSize: 6.5 },
  ];
  
  metricsData.forEach((metric, index) => {
    const xPos = 20 + profileWidth + gap + (index * (metricsWidth + gap));
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(xPos, yPos, metricsWidth, rowBoxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(metric.label, xPos + metricsWidth / 2, yPos + 7, { align: 'center' });
    
    pdf.setFontSize(metric.fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(metric.value, xPos + metricsWidth / 2, yPos + 16, { align: 'center' });
  });
  
  // ASSESSMENT SUMMARY Section
  yPos = 138;
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  yPos += 5;
  
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
  yPos += 8;
  
  const halfWidth = (pageWidth - 40) / 2;
  const leftColStart = 20;
  const rightColStart = leftColStart + halfWidth + 10;
  const chartWidth = halfWidth - 5;
  const chartHeight = 55;
  
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
    
    // Right column - Radar Chart
    if (data.fitChartImage) {
      try {
        pdf.addImage(data.fitChartImage, 'PNG', rightColStart, fitScoresStartY - 5, chartWidth, chartHeight);
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
      // Draw simple radar placeholder
      const centerX = rightColStart + chartWidth / 2;
      const centerY = fitScoresStartY + chartHeight / 2 + 5;
      const radius = 18;
      pdf.setDrawColor(59, 130, 246);
      pdf.setFillColor(59, 130, 246);
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
          pdf.setLineWidth(0.3);
        }
        pdf.line(centerX, centerY, x, y);
      }
      pdf.setFillColor(59, 130, 246);
      pdf.circle(centerX, centerY, 2, 'F');
    }
    
    yPos = Math.max(yPos, fitScoresStartY + chartHeight) + 10;
  }
  
  // AI Readiness Skills
  if (data.aiData) {
    if (yPos > pageHeight - 100) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('AI Readiness Assessment', leftColStart, yPos);
    yPos += 5;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const aiMeasures = 'Measures: AI Literacy & Prompt Engineering, Technical Fundamentals, Data Fluency, Critical Thinking & Problem-Solving, Adaptability & Continuous Learning, Collaboration & Communication, Responsible AI & Ethical Awareness, Creativity & Innovation, Domain Expertise';
    const aiMeasureLines = pdf.splitTextToSize(aiMeasures, pageWidth - 40);
    aiMeasureLines.forEach((line: string) => {
      pdf.text(line, leftColStart, yPos);
      yPos += 4;
    });
    yPos += 6;
    
    const aiScoresStartY = yPos;
    
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
      
      yPos += 7;
    });
    
    // Right column - Radar Chart
    const aiChartHeight = 70; // Slightly taller for more skills
    if (data.aiChartImage) {
      try {
        pdf.addImage(data.aiChartImage, 'PNG', rightColStart, aiScoresStartY - 5, chartWidth, aiChartHeight);
      } catch (e) {
        // Fallback: draw placeholder box
        pdf.setDrawColor(229, 231, 235);
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(rightColStart, aiScoresStartY - 5, chartWidth, aiChartHeight, 2, 2, 'FD');
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text('AI Readiness Chart', rightColStart + chartWidth / 2, aiScoresStartY + aiChartHeight / 2, { align: 'center' });
      }
    } else {
      // Draw placeholder box if no chart image
      pdf.setDrawColor(229, 231, 235);
      pdf.setFillColor(249, 250, 251);
      pdf.roundedRect(rightColStart, aiScoresStartY - 5, chartWidth, aiChartHeight, 2, 2, 'FD');
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text('AI Readiness', rightColStart + chartWidth / 2, aiScoresStartY + 10, { align: 'center' });
      // Draw simple radar placeholder
      const centerX = rightColStart + chartWidth / 2;
      const centerY = aiScoresStartY + aiChartHeight / 2 + 5;
      const radius = 22;
      pdf.setDrawColor(34, 197, 94);
      for (let i = 0; i < 9; i++) {
        const angle = (i * Math.PI * 2) / 9 - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        pdf.setLineWidth(0.3);
        pdf.line(centerX, centerY, x, y);
      }
      pdf.setFillColor(34, 197, 94);
      pdf.circle(centerX, centerY, 2, 'F');
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
    pdf.text('Progressive evaluation of prompt engineering skills across 7 difficulty levels', 20, yPos);
    yPos += 12;
    
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
    
    // Level breakdown - compact bars
    if (data.promptData.levels && data.promptData.levels.length > 0) {
      data.promptData.levels.forEach((levelData) => {
        const levelPerf = getPerformanceLevel(levelData.totalScore);
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`Level ${levelData.level}`, 25, yPos);
        
        // Progress bar - smaller
        const barWidth = 90;
        const barX = 50;
        pdf.setFillColor(229, 231, 235);
        pdf.rect(barX, yPos - 2.5, barWidth, 4, 'F');
        pdf.setFillColor(levelPerf.color[0], levelPerf.color[1], levelPerf.color[2]);
        pdf.rect(barX, yPos - 2.5, (barWidth * levelData.totalScore) / 100, 4, 'F');
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(levelPerf.color[0], levelPerf.color[1], levelPerf.color[2]);
        pdf.text(`${levelData.totalScore}`, pageWidth - 28, yPos, { align: 'right' });
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text('/100', pageWidth - 20, yPos, { align: 'right' });
        
        yPos += 8;
      });
    }
    
    yPos += 10;
  }
  
  // AIQ Section
  if (data.aiqData) {
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: AI Ethics, Bias Detection, Fairness, Transparency, and Responsible AI Deployment', 20, yPos);
    yPos += 15;
    
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
  
  // ========== PAGE 5: FINAL CANDIDATE RECOMMENDATIONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'FINAL CANDIDATE RECOMMENDATIONS', yPos, pageWidth);
  yPos += 8;
  
  // Generate recommendation paragraphs based on scores
  let roleRecommendation = '';
  let environmentRecommendation = '';
  let strengthsRecommendation = '';
  let developmentRecommendation = '';
  
  // Build role recommendation paragraph
  if (fitAvg >= 80 && aiAvg >= 70) {
    roleRecommendation = `Based on ${data.candidateName}'s exceptional combination of interpersonal skills and technical AI capabilities, they would excel in leadership positions such as AI Project Lead or Innovation Manager. Their strong behavioral foundation paired with advanced AI readiness makes them well-suited for roles that bridge technical implementation with team coordination.`;
  } else if (fitAvg >= 70) {
    roleRecommendation = `${data.candidateName} demonstrates solid interpersonal strengths that would translate well into people-focused positions. Roles such as Team Coordinator or Client Success Manager would leverage their natural empathy and relationship-building capabilities effectively.`;
  } else {
    roleRecommendation = `${data.candidateName}'s profile suggests potential in roles requiring structured thinking and clear communication. Positions like Technical Writer, Content Strategist, or Knowledge Manager would allow them to apply their organizational abilities while continuing to develop other competencies.`;
  }
  
  if (data.promptData && data.promptData.totalScore >= 80) {
    roleRecommendation += ` Their exceptional prompt engineering abilities also open opportunities in specialized AI roles such as Prompt Engineer or AI Content Strategist.`;
  } else if (aiAvg >= 75) {
    roleRecommendation += ` Their strong AI readiness scores indicate they could also succeed in AI Integration Specialist roles requiring hands-on technical implementation.`;
  }
  
  // Build environment recommendation paragraph
  const envFactors: string[] = [];
  if (fitAvg >= 75) {
    envFactors.push('environments that value clear documentation and knowledge sharing');
  }
  if (data.aiqData && data.aiqData.totalScore >= 70) {
    envFactors.push('organizations with strong ethical frameworks');
  }
  if (aiAvg >= 70) {
    envFactors.push('AI-forward companies embracing emerging technologies');
  }
  if (envFactors.length === 0) {
    envFactors.push('structured environments with clear processes');
    envFactors.push('collaborative teams focused on continuous improvement');
  }
  
  environmentRecommendation = `This candidate would thrive in ${envFactors.slice(0, -1).join(', ')}${envFactors.length > 1 ? ' and ' : ''}${envFactors[envFactors.length - 1]}. Their assessment profile suggests they perform best when given clear objectives while having the autonomy to determine how to achieve them.`;
  
  // Build strengths paragraph
  const strengthFactors: string[] = [];
  if (data.fitData) {
    const sortedFit = Object.entries(data.fitData.scores).sort(([,a], [,b]) => b - a);
    if (sortedFit[0]) strengthFactors.push(`strong ${sortedFit[0][0].toLowerCase()}`);
    if (sortedFit[1]) strengthFactors.push(`solid ${sortedFit[1][0].toLowerCase()}`);
  }
  if (data.promptData && data.promptData.totalScore >= 75) {
    strengthFactors.push('excellent ability to articulate requirements with precision');
  }
  if (data.aiqData && data.aiqData.totalScore >= 70) {
    strengthFactors.push('keen awareness of potential risks and ethical considerations');
  }
  
  if (strengthFactors.length > 0) {
    strengthsRecommendation = `${data.candidateName}'s key strengths include ${strengthFactors.join(', ')}. These capabilities position them to add immediate value in roles that require clear communication and thoughtful problem-solving.`;
  } else {
    strengthsRecommendation = `${data.candidateName} demonstrates a willingness to learn and adapt, providing a solid foundation for skill development. With appropriate mentorship and training, they have potential for growth across multiple competency areas.`;
  }
  
  // Build development paragraph
  const devFactors: string[] = [];
  if (data.fitData) {
    const sortedFit = Object.entries(data.fitData.scores).sort(([,a], [,b]) => a - b);
    if (sortedFit[0] && sortedFit[0][1] < 70) {
      devFactors.push(`${sortedFit[0][0]} through targeted training and practical exercises`);
    }
  }
  if (data.aiData) {
    const sortedAI = Object.entries(data.aiData.scores).sort(([,a], [,b]) => a - b);
    if (sortedAI[0] && sortedAI[0][1] < 65) {
      devFactors.push(`${sortedAI[0][0]} skills through hands-on projects`);
    }
  }
  if (data.aiqData && data.aiqData.totalScore < 60) {
    devFactors.push('AI ethics awareness through dedicated training programs');
  }
  
  if (devFactors.length > 0) {
    developmentRecommendation = `To maximize ${data.candidateName}'s potential, we recommend focusing development efforts on ${devFactors.join(' and ')}. Structured learning combined with real-world application will accelerate their growth in these areas.`;
  } else {
    developmentRecommendation = `${data.candidateName} shows a well-rounded profile with no critical gaps. To further their development, consider leadership training and cross-functional project exposure to translate their technical strengths into broader organizational impact.`;
  }
  
  // Render paragraphs
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('ROLE SUITABILITY', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const roleLines = pdf.splitTextToSize(roleRecommendation, pageWidth - 40);
  roleLines.forEach((line: string) => {
    pdf.text(line, 20, yPos);
    yPos += 5;
  });
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('OPTIMAL ENVIRONMENT', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const envLines = pdf.splitTextToSize(environmentRecommendation, pageWidth - 40);
  envLines.forEach((line: string) => {
    pdf.text(line, 20, yPos);
    yPos += 5;
  });
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('KEY STRENGTHS', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const strengthLines = pdf.splitTextToSize(strengthsRecommendation, pageWidth - 40);
  strengthLines.forEach((line: string) => {
    pdf.text(line, 20, yPos);
    yPos += 5;
  });
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(234, 179, 8);
  pdf.text('DEVELOPMENT FOCUS', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const devLines = pdf.splitTextToSize(developmentRecommendation, pageWidth - 40);
  devLines.forEach((line: string) => {
    pdf.text(line, 20, yPos);
    yPos += 5;
  });
  
  // ========== AI PROFILE INSIGHTS (if available) ==========
  if (data.profileInsights) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    
    yPos = 35;
    yPos = addSectionHeader(pdf, 'AI-POWERED PROFILE INSIGHTS', yPos, pageWidth);
    yPos += 10;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Generated analysis based on assessment performance patterns', 20, yPos);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const insightLines = pdf.splitTextToSize(data.profileInsights, pageWidth - 40);
    insightLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        addBackgroundPattern(pdf, pageWidth, pageHeight);
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      pdf.text(line, 20, yPos);
      yPos += 6;
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
    pdf.setTextColor(55, 65, 81);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + (idx * 5));
    });
    yPos += (stepLines.length * 5) + 3;
  });
  
  yPos += 10;
  
  // ADDITIONAL SERVICES ON REQUEST section
  yPos = addSectionHeader(pdf, 'ADDITIONAL SERVICES ON REQUEST', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(10);
  pdf.setTextColor(107, 114, 128);
  pdf.text('HumanMetrix offers additional analysis services to support your hiring decision:', 20, yPos);
  yPos += 10;
  
  const additionalServices = [
    {
      name: 'Role Fit Analysis',
      description: 'Detailed analysis of candidate alignment with specific role requirements and skill criticality mapping'
    },
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
    }
  ];
  
  additionalServices.forEach((service, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
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
  
  // Contact information
  yPos += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Contact us at assessments@humanmetrix.co.uk for more information about these services.', 20, yPos);
  
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
