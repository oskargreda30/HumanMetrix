import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { getAIQBandInterpretation } from '@/data/aiq-questions';
import { savePdfMobile } from './pdfStyles';
import { FIT_SKILLS, AI_READINESS_SKILLS } from './assessmentSkills';
import { PROMPT_ARCHITECTURE_DIMENSIONS, AIQ_BANDS } from '@/components/SkillsLegend';

interface CandidateData {
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
  results?: any[];
  tags?: Array<{ tag: string }>;
  notes?: Array<{ note: string; createdAt: string }>;
}

interface SkillData {
  name: string;
  score: number;
  assessment: string;
}

interface PlatformAverages {
  totalCandidates: number;
  avgScoreAcrossCandidates: number;
  skillAverages: Record<string, number>;
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
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  // HumanMetrix Logo - full size (38x38), transparent edges allow text overlap
  try {
    pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', 8, 4, 38, 38);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  // Company name - positioned to overlap with logo's transparent right edge
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 42, 20);
  
  // Tagline - positioned closer to company name (reduced gap from 7mm to 4mm)
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 42, 24);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to fit text within a given width by adjusting font size and adding ellipsis if needed
function fitMetricValue(pdf: jsPDF, text: string, maxWidth: number, initialFontSize: number = 14, minFontSize: number = 10): { text: string; fontSize: number } {
  let fontSize = initialFontSize;
  let fittedText = text;
  
  // Try progressively smaller font sizes
  while (fontSize >= minFontSize) {
    pdf.setFontSize(fontSize);
    const textWidth = pdf.getStringUnitWidth(fittedText) * fontSize / pdf.internal.scaleFactor;
    
    if (textWidth <= maxWidth) {
      return { text: fittedText, fontSize };
    }
    
    fontSize -= 0.5;
  }
  
  // If still too wide at minimum font, add ellipsis
  pdf.setFontSize(minFontSize);
  while (fittedText.length > 0) {
    const testText = fittedText.substring(0, fittedText.length - 1) + '...';
    const textWidth = pdf.getStringUnitWidth(testText) * minFontSize / pdf.internal.scaleFactor;
    
    if (textWidth <= maxWidth) {
      return { text: testText, fontSize: minFontSize };
    }
    
    fittedText = fittedText.substring(0, fittedText.length - 1);
  }
  
  return { text: '...', fontSize: minFontSize };
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

// Helper to add "How to Read Our Reports" guide page (first page of report)
function addReportGuidePage(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
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
  pdf.text('A guide to understanding your assessment results', pageWidth / 2, yPos + 21, { align: 'center' });
  
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
  
  // Individual Report Guide content - reordered as requested
  yPos = addGuideItem(1, 'Understanding Trait-Based Scores', 
    'FIT and AI Readiness are trait-based assessments. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.', yPos);
  
  yPos = addGuideItem(2, 'FIT Assessment (Behavioral)', 
    'Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores indicate stronger trait presence. Match against role requirements to assess fit.', yPos);
  
  yPos = addGuideItem(3, 'AI Readiness (Technical)', 
    'Measures 9 AI-related capabilities including AI Literacy, Change Adaptability, and Data Fluency. Higher scores indicate stronger aptitude in each area.', yPos);
  
  yPos = addGuideItem(4, 'Prompt Architecture', 
    'Evaluates AI prompt engineering skills across 7 difficulty levels. Each level tests clarity, structure, context relevance, creativity, and iterative improvement.', yPos);
  
  yPos = addGuideItem(5, 'AIQ (Ethics)', 
    'Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Scores: 81-100 Highly Developed, 61-80 Proficient, 41-60 Developing, 21-40 Emerging, 0-20 Foundational.', yPos);
  
  yPos = addGuideItem(6, 'Skills Legend', 
    'The final page contains a complete reference of all assessed competencies with detailed descriptions. Use this to understand what each skill measures.', yPos);
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
  pdf.setTextColor(234, 179, 8); // Yellow to match pdfExport.ts
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

// Helper to create section header - compact style with more spacing from header
function addSectionHeader(pdf: jsPDF, title: string, yPosition: number, pageWidth: number): number {
  // Add extra spacing before section header for visual separation from page header
  const adjustedY = yPosition + 4;
  
  // Clear any previous draw color and set fill only
  pdf.setDrawColor(243, 244, 246);
  pdf.setFillColor(243, 244, 246);
  pdf.rect(20, adjustedY, pageWidth - 40, 9, 'F'); // Smaller box height (9 instead of 12)
  
  pdf.setFontSize(10); // Smaller font (10 instead of 13)
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  // Title positioned in the middle of the box (adjustedY + 6 for center of 9-height box)
  pdf.text(title, 25, adjustedY + 6);
  pdf.setTextColor(0, 0, 0);
  
  return adjustedY + 12; // Reduced return offset (12 instead of 16)
}

// Helper to determine performance level
function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Exceptional', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Strong', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Competent', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
}

// Helper to get blue shade for skill scores (darker = higher score)
function getBlueShadeColor(score: number): [number, number, number] {
  if (score >= 80) return [30, 64, 175];    // Dark blue (blue-800)
  if (score >= 60) return [37, 99, 235];    // Medium-dark blue (blue-600)
  if (score >= 40) return [59, 130, 246];   // Medium blue (blue-500)
  if (score >= 20) return [96, 165, 250];   // Light-medium blue (blue-400)
  return [147, 197, 253];                    // Light blue (blue-300)
}

// Helper to get AIQ band-specific colors (aligned with 20% band system)
function getAIQBandColor(score: number): [number, number, number] {
  if (score >= 80) return [34, 197, 94];   // Green - Exemplary
  if (score >= 60) return [59, 130, 246];  // Blue - Strong
  if (score >= 40) return [245, 158, 11];  // Amber - Developing
  if (score >= 20) return [249, 115, 22];  // Orange - Significant Gaps
  return [239, 68, 68];                     // Red - Critical Concerns
}

// Helper to generate role-based recommendations based on assessment profile
interface RoleRecommendations {
  suitableRoles: string[];
  thrivingEnvironments: string[];
  roleStrengths: string[];
}

function generateRoleRecommendations(
  skills: SkillData[],
  avgScore: number,
  fitScore: number | null,
  aiReadinessScore: number | null,
  promptArchScore: number | null,
  aiqScore: number | null
): RoleRecommendations {
  // Determine strongest assessment area
  const assessmentScores: { name: string; score: number }[] = [];
  if (fitScore !== null) assessmentScores.push({ name: 'fit', score: fitScore });
  if (aiReadinessScore !== null) assessmentScores.push({ name: 'ai_readiness', score: aiReadinessScore });
  if (promptArchScore !== null) assessmentScores.push({ name: 'prompt_architecture', score: promptArchScore });
  if (aiqScore !== null) assessmentScores.push({ name: 'aiq', score: aiqScore });
  
  assessmentScores.sort((a, b) => b.score - a.score);
  const strongestArea = assessmentScores[0]?.name || 'fit';
  const secondStrongest = assessmentScores[1]?.name;
  
  // Role mappings based on strongest assessment areas
  const roleMap: Record<string, string[]> = {
    fit: [
      'Team Leader – Strong interpersonal skills and adaptability suit leadership positions.',
      'Project Manager – Collaborative nature and resilience enable effective project delivery.',
      'HR Business Partner – People-focused skills translate well to human resources functions.',
      'Customer Success Manager – Relationship-building abilities drive client retention.',
    ],
    ai_readiness: [
      'Business Analyst – Systematic thinking enables data-driven decision making.',
      'Digital Transformation Lead – AI literacy positions them to drive modernization initiatives.',
      'Innovation Manager – Technical awareness combined with strategic thinking suits innovation roles.',
      'Strategy Consultant – Ability to evaluate AI opportunities informs business recommendations.',
    ],
    prompt_architecture: [
      'Technical Writer – Clear communication skills translate complex concepts effectively.',
      'Content Strategist – Structured thinking enables cohesive content planning.',
      'Knowledge Manager – Information organization abilities support institutional learning.',
      'Communications Specialist – Precision in language suits stakeholder engagement.',
    ],
    aiq: [
      'Compliance Officer – Ethical judgment supports regulatory adherence.',
      'Risk Analyst – Principled decision-making identifies potential issues early.',
      'Quality Assurance Lead – Attention to standards ensures consistent outputs.',
      'Policy Advisor – Ethical reasoning informs governance recommendations.',
    ],
  };
  
  // Environment mappings
  const environmentMap: Record<string, string[]> = {
    fit: [
      'Collaborative team settings with regular interaction',
      'Dynamic environments requiring adaptability',
      'Roles involving mentoring or coaching others',
      'Organizations valuing interpersonal relationships',
    ],
    ai_readiness: [
      'Forward-thinking organizations embracing technology',
      'Data-driven decision-making cultures',
      'Environments encouraging continuous learning',
      'Roles bridging technical and business functions',
    ],
    prompt_architecture: [
      'Environments requiring clear documentation',
      'Roles involving training or knowledge transfer',
      'Organizations prioritizing communication excellence',
      'Settings requiring translation of complex information',
    ],
    aiq: [
      'Organizations with strong ethical frameworks',
      'Regulated industries requiring compliance focus',
      'Environments valuing transparency and accountability',
      'Roles requiring careful risk assessment',
    ],
  };
  
  // Strength mappings
  const strengthMap: Record<string, string[]> = {
    fit: [
      'Building and maintaining productive working relationships',
      'Adapting to changing priorities and environments',
      'Facilitating collaboration across diverse teams',
      'Navigating ambiguity with resilience',
    ],
    ai_readiness: [
      'Evaluating technology solutions for business problems',
      'Identifying opportunities for process improvement',
      'Bridging communication between technical and non-technical stakeholders',
      'Staying current with emerging tools and methodologies',
    ],
    prompt_architecture: [
      'Articulating requirements with precision and clarity',
      'Structuring information for maximum comprehension',
      'Creating documentation that drives consistent understanding',
      'Translating complex concepts into actionable guidance',
    ],
    aiq: [
      'Identifying potential risks before they become problems',
      'Making principled decisions under uncertainty',
      'Evaluating options against ethical frameworks',
      'Building trust through consistent, fair judgment',
    ],
  };
  
  // Select roles (primary area + blend with secondary if available)
  let suitableRoles = roleMap[strongestArea]?.slice(0, 3) || roleMap.fit.slice(0, 3);
  
  // Select environments (blend of top two areas)
  let thrivingEnvironments = environmentMap[strongestArea]?.slice(0, 3) || environmentMap.fit.slice(0, 3);
  if (secondStrongest && environmentMap[secondStrongest]) {
    thrivingEnvironments = [
      ...environmentMap[strongestArea].slice(0, 2),
      environmentMap[secondStrongest][0],
    ];
  }
  
  // Select strengths (blend of top two areas)
  let roleStrengths = strengthMap[strongestArea]?.slice(0, 3) || strengthMap.fit.slice(0, 3);
  if (secondStrongest && strengthMap[secondStrongest]) {
    roleStrengths = [
      ...strengthMap[strongestArea].slice(0, 2),
      strengthMap[secondStrongest][0],
    ];
  }
  
  return { suitableRoles, thrivingEnvironments, roleStrengths };
}

// Helper to get Prompt Architecture level color (3-color blue gradient)
function getPromptLevelColor(level: number): [number, number, number] {
  if (level <= 2) return [147, 197, 253];  // Light blue for beginner levels
  if (level <= 5) return [59, 130, 246];   // Medium blue for intermediate levels
  return [37, 99, 235];                     // Dark blue for advanced levels
}

interface RoleComparisonData {
  role: {
    name: string;
    description?: string;
  };
  alignment: {
    overallFit: number;
    skillAlignments: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
    }>;
    strengths: string[];
    gaps: string[];
    recommendations: string;
  };
}

interface PromptArchitectureData {
  level: number;
  userPrompt: string;
  aiResponse?: string;
  evaluationScores?: {
    clarity: number;
    structure: number;
    contextRelevance: number;
    creativity: number;
    iterativeImprovement: number;
  };
  totalScore?: number;
  feedback?: string;
}

export async function exportEnhancedCandidatePDF(
  candidate: CandidateData,
  skills: SkillData[],
  platformAverages: PlatformAverages,
  radarChartImages?: { fit?: string; aiReadiness?: string },
  roleComparison?: RoleComparisonData,
  promptArchitectureData?: PromptArchitectureData[]
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const candidateName = candidate.user.firstName || candidate.user.lastName
    ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
    : 'Candidate';

  // Pre-declare result variables to avoid duplicate declarations
  const fitResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'fit' && r.status === 'completed');
  const aiReadinessResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'ai_readiness' && r.status === 'completed');
  const promptArchResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'prompt_architecture' && r.status === 'completed');
  const aiqResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'aiq' && r.status === 'completed');

  // ========== PAGE 1: HOW TO READ OUR REPORTS GUIDE ==========
  addReportGuidePage(pdf, pageWidth, pageHeight);
  
  // ========== PAGE 2: COVER PAGE ==========
  pdf.addPage();
  let yPos = 30;
  
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section
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
  pdf.setFont('helvetica', 'bold');
  pdf.text(candidateName.toUpperCase(), pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Define consistent margins and box widths for alignment
  const leftMargin = 20;
  const rightMargin = 20;
  const totalBoxWidth = pageWidth - leftMargin - rightMargin;
  const boxGap = 5;
  
  // Candidate Information Card with light blue border
  yPos = 110;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(191, 219, 254); // Light blue border (#BFDBFE)
  pdf.setLineWidth(0.5);
  pdf.roundedRect(leftMargin, yPos, totalBoxWidth, 32, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', leftMargin + totalBoxWidth / 2, yPos + 8, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Name: ${candidateName}`, leftMargin + totalBoxWidth / 2, yPos + 16, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Email: ${candidate.user.email}`, leftMargin + totalBoxWidth / 2, yPos + 22, { align: 'center' });
  const uniqueCompletedTypes = new Set(candidate.results?.filter((r: any) => r.status === 'completed').map((r: any) => r.assessmentType) || []);
  pdf.text(`Assessments Completed: ${uniqueCompletedTypes.size}`, leftMargin + totalBoxWidth / 2, yPos + 28, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Calculate overall performance metrics - average across assessment types, not individual skills
  const avgScore = (() => {
    if (!candidate.results || candidate.results.length === 0) return 0;
    
    const completedResults = candidate.results.filter((r: any) => r.status === 'completed');
    if (completedResults.length === 0) return 0;
    
    const assessmentScores: number[] = [];
    
    completedResults.forEach((result: any) => {
      if (result.scores && Object.keys(result.scores).length > 0) {
        // For skill-based assessments, calculate average of scores
        const scores = Object.values(result.scores) as number[];
        const avg = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
        assessmentScores.push(avg);
      } else if (result.totalScore !== null && result.totalScore !== undefined) {
        // For totalScore assessments (AIQ, Prompt Architecture)
        assessmentScores.push(result.totalScore);
      }
    });
    
    if (assessmentScores.length === 0) return 0;
    return Math.round(assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length);
  })();
  const performance = getPerformanceLevel(avgScore);
  
  // Key Metrics (moved up since Executive Summary removed)
  yPos = 150;
  // Calculate box widths to fit 3 boxes with gaps within totalBoxWidth
  const metricBoxWidth = (totalBoxWidth - boxGap * 2) / 3; // 3 boxes with 2 gaps
  
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const metricsData = [
    { label: 'Skills Assessed', value: skills.length.toString() },
    { label: 'Top Skill', value: topSkills[0]?.name || 'N/A' },
  ];
  
  metricsData.forEach((metric, index) => {
    const xPos = leftMargin + (index * (metricBoxWidth + boxGap));
    const boxInnerWidth = metricBoxWidth;
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(191, 219, 254); // Light blue border (#BFDBFE)
    pdf.setLineWidth(0.5);
    pdf.roundedRect(xPos, yPos, boxInnerWidth, 28, 2, 2, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(metric.label, xPos + boxInnerWidth / 2, yPos + 6, { align: 'center' });
    
    // For Top Skill, allow text to wrap to two lines
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    
    if (metric.label === 'Top Skill') {
      // Use smaller font and allow wrapping to two lines
      pdf.setFontSize(8);
      const maxTextWidth = boxInnerWidth - 6; // Leave 3mm padding on each side
      const lines = pdf.splitTextToSize(metric.value, maxTextWidth);
      const lineHeight = 4;
      const startY = lines.length > 1 ? yPos + 13 : yPos + 16;
      lines.slice(0, 2).forEach((line: string, lineIdx: number) => {
        pdf.text(line, xPos + boxInnerWidth / 2, startY + (lineIdx * lineHeight), { align: 'center' });
      });
    } else {
      // Fit other metric values to the available width
      const maxValueWidth = boxInnerWidth - 4; // Leave 2mm padding on each side
      const fitted = fitMetricValue(pdf, metric.value, maxValueWidth, 10, 7);
      pdf.setFontSize(fitted.fontSize);
      pdf.text(fitted.text, xPos + boxInnerWidth / 2, yPos + 18, { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== ASSESSMENT SUMMARY ==========
  yPos = 188 + 10; // Adjusted for taller metrics boxes (28mm height)
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  yPos += 2;
  
  // FIT Assessment Summary
  if (fitResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const fitAvg = Math.round(Object.values(fitResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(fitResultSummary.scores).length);
    const fitPerf = getPerformanceLevel(fitAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment (Behavioral Skills)', 25, yPos);
    
    pdf.setTextColor(fitPerf.color[0], fitPerf.color[1], fitPerf.color[2]);
    pdf.text(`${fitAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const fitSummary = fitAvg >= 70 
      ? `Strong behavioral competencies including adaptability, curiosity, and interpersonal skills.`
      : `Foundational behavioral skills with growth opportunities in adaptability and interpersonal effectiveness.`;
    const fitLines = pdf.splitTextToSize(fitSummary, pageWidth - 50);
    fitLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += fitLines.length * 3 + 5;
  }
  
  // AI Readiness Summary
  if (aiReadinessResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const aiAvg = Math.round(Object.values(aiReadinessResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(aiReadinessResultSummary.scores).length);
    const aiPerf = getPerformanceLevel(aiAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(139, 92, 246);
    pdf.text('AI Readiness', 25, yPos);
    
    pdf.setTextColor(aiPerf.color[0], aiPerf.color[1], aiPerf.color[2]);
    pdf.text(`${aiAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const aiSummary = aiAvg >= 70 
      ? `Strong AI literacy with ability to leverage AI tools for productivity multiplication.`
      : `Foundational AI awareness; additional training recommended to fully leverage AI capabilities.`;
    const aiLines = pdf.splitTextToSize(aiSummary, pageWidth - 50);
    aiLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += aiLines.length * 3 + 5;
  }
  
  // Prompt Architecture Summary
  if (promptArchResultSummary && promptArchitectureData && promptArchitectureData.length > 0) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const promptAvg = Math.round(
      promptArchitectureData.reduce((sum, p) => sum + (p.totalScore || 0), 0) / promptArchitectureData.length
    );
    const promptPerf = getPerformanceLevel(promptAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('Prompt Architecture', 25, yPos);
    
    pdf.setTextColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
    pdf.text(`${promptAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const promptSummary = promptAvg >= 70 
      ? `Strong prompt engineering skills; capable of designing effective AI interactions.`
      : `Basic prompt engineering ability with room for development in sophisticated AI prompts.`;
    const promptLines = pdf.splitTextToSize(promptSummary, pageWidth - 50);
    promptLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += promptLines.length * 3 + 5;
  }
  
  // AIQ Summary - Graded Band Interpretation
  if (aiqResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const aiqScore = aiqResultSummary.totalScore;
    const aiqBandColor = getAIQBandColor(aiqScore);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Algorithmic Integrity Quotient (AIQ)', 25, yPos);
    
    pdf.setTextColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.text(`${aiqScore}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 8;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== RADAR CHARTS PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS VISUALIZATION', yPos, pageWidth);
  yPos += 5;
  const addIndividualScores = (skillsList: SkillData[], yPosition: number): number => {
    let currentY = yPosition;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Individual Skill Scores:', 20, currentY);
    currentY += 6;
    
    const colWidth = (pageWidth - 40) / 3;
    skillsList.forEach((skill, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const xPos = 20 + (col * colWidth);
      const yPosRow = currentY + (row * 6);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`${skill.name}:`, xPos, yPosRow);
      
      const perf = getPerformanceLevel(skill.score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${skill.score}`, xPos + colWidth - 15, yPosRow);
    });
    
    return currentY + (Math.ceil(skillsList.length / 3) * 6) + 5;
  };
  
  // FIT Assessment Radar Chart
  const fitSkills = skills.filter(s => s.assessment === 'FIT Assessment');
  if (radarChartImages?.fit && fitSkills.length > 0) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
    yPos += 6;
    
    // What It Measures description
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics,', 52, yPos);
    yPos += 4;
    pdf.text('Growth Mindset, and Interpersonal Agility.', 20, yPos);
    yPos += 8;
    
    try {
      const startY = yPos;
      
      // LEFT SIDE: Individual Skill Scores
      const leftColumnX = 20;
      const leftColumnWidth = 70;
      
      let scoresY = startY + 10; // Push down to align better with radar chart center
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Individual Skill Scores:', leftColumnX, scoresY);
      scoresY += 7;
      
      fitSkills.forEach((skill, index) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`${skill.name}:`, leftColumnX, scoresY);
        
        // Use blue shades instead of multicolor
        const blueColor = getBlueShadeColor(skill.score);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        pdf.text(`${skill.score}`, leftColumnX + leftColumnWidth - 10, scoresY, { align: 'right' });
        
        scoresY += 6;
      });
      
      // RIGHT SIDE: Radar Chart (scaled to 90%)
      const imgProps = pdf.getImageProperties(radarChartImages.fit);
      const chartMaxWidth = (pageWidth - leftColumnX - leftColumnWidth - 25) * 0.9;
      const chartMaxHeight = 80 * 0.9;
      
      let chartWidth = chartMaxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > chartMaxHeight) {
        chartHeight = chartMaxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      // Position chart closer to left column (reduced right margin from 15 to 35 from left column)
      const chartX = leftColumnX + leftColumnWidth + 10;
      pdf.addImage(radarChartImages.fit, 'PNG', chartX, startY, chartWidth, chartHeight);
      
      yPos = Math.max(scoresY, startY + chartHeight) + 5;
      
      // Workplace Impact at bottom of FIT section
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('Workplace Impact:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Predicts adaptability, initiative, collaboration quality, and resilience under pressure.', 52, yPos);
      yPos += 4;
      pdf.text('High scorers drive innovation and navigate ambiguity effectively.', 20, yPos);
      yPos += 10;
    } catch (error) {
      console.error('Error adding FIT chart:', error);
      yPos += 10;
    }
  }
  
  // AI Readiness Radar Chart (on same page)
  const aiReadinessSkills = skills.filter(s => s.assessment === 'AI Readiness');
  if (radarChartImages?.aiReadiness && aiReadinessSkills.length > 0) {
    // Check if we need a new page for AI Readiness section
    if (yPos > pageHeight - 100) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 45;
    }
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('AI Readiness Assessment', 20, yPos);
    yPos += 6;
    
    // What It Measures description
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Nine AI-specific competencies: AI Literacy, Prompting Effectiveness, Technical Fluency,', 52, yPos);
    yPos += 4;
    pdf.text('Critical Thinking, Adaptive Learning, Responsible AI Integration, Domain Expertise, Creative Innovation,', 20, yPos);
    yPos += 4;
    pdf.text('and Cross-functional Collaboration.', 20, yPos);
    yPos += 8;
    
    try {
      const startY = yPos;
      
      // LEFT SIDE: Individual Skill Scores
      const leftColumnX = 20;
      const leftColumnWidth = 70;
      
      let scoresY = startY + 10; // Push down to align better with radar chart center
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Individual Skill Scores:', leftColumnX, scoresY);
      scoresY += 7;
      
      aiReadinessSkills.forEach((skill, index) => {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text(`${skill.name}:`, leftColumnX, scoresY);
        
        // Use blue shades instead of multicolor
        const blueColor = getBlueShadeColor(skill.score);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
        pdf.text(`${skill.score}`, leftColumnX + leftColumnWidth - 10, scoresY, { align: 'right' });
        
        scoresY += 6;
      });
      
      // RIGHT SIDE: Radar Chart (scaled to 90%)
      const imgProps = pdf.getImageProperties(radarChartImages.aiReadiness);
      const chartMaxWidth = (pageWidth - leftColumnX - leftColumnWidth - 25) * 0.9;
      const chartMaxHeight = 80 * 0.9;
      
      let chartWidth = chartMaxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > chartMaxHeight) {
        chartHeight = chartMaxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      // Position chart closer to left column (reduced right margin from 15 to 35 from left column)
      const chartX = leftColumnX + leftColumnWidth + 10;
      pdf.addImage(radarChartImages.aiReadiness, 'PNG', chartX, startY, chartWidth, chartHeight);
      
      yPos = Math.max(scoresY, startY + chartHeight) + 5;
      
      // Workplace Impact at bottom of AI Readiness section
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(59, 130, 246);
      pdf.text('Workplace Impact:', 20, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Determines ability to leverage AI tools for productivity gains, make sound AI-assisted decisions,', 52, yPos);
      yPos += 4;
      pdf.text('and integrate AI responsibly into workflows. High scorers multiply their output through effective AI collaboration.', 20, yPos);
      yPos += 10;
    } catch (error) {
      console.error('Error adding AI Readiness chart:', error);
      yPos += 10;
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PROMPT ARCHITECTURE ASSESSMENT ==========
  if (promptArchitectureData && promptArchitectureData.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);
    yPos += 5;
    
    // What It Measures description
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Prompt engineering expertise across five equal dimensions (20% each): Clarity, Structure,', 52, yPos);
    yPos += 4;
    pdf.text('Context Relevance, Creativity, and Iterative Improvement. Progressive difficulty levels test real-world prompting skills.', 20, yPos);
    yPos += 8;
    
    // Overall score card
    const completedLevels = promptArchitectureData.filter(p => p.totalScore !== undefined);
    if (completedLevels.length > 0) {
      const avgScore = Math.round(
        completedLevels.reduce((sum, p) => sum + (p.totalScore || 0), 0) / completedLevels.length
      );
      const performance = getPerformanceLevel(avgScore);
      
      // Compact score box - reduced height from 24 to 18
      const promptBoxWidth = 70;
      const promptBoxX = (pageWidth - promptBoxWidth) / 2;
      
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(promptBoxX, yPos, promptBoxWidth, 18, 2, 2, 'FD');
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Overall Prompt Engineering Score', pageWidth / 2, yPos + 5, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(performance.color[0], performance.color[1], performance.color[2]);
      pdf.text(`${avgScore}/100`, pageWidth / 2, yPos + 11, { align: 'center' });
      
      pdf.setFontSize(5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${completedLevels.length} level(s) completed`, pageWidth / 2, yPos + 15, { align: 'center' });
      
      yPos += 28; // Increased spacing before progress bars
    }
    
    pdf.setTextColor(0, 0, 0);
    
    // Individual level results - clean list format with progress bars
    const barHeight = 4;
    const barSpacing = 8;
    const barWidth = pageWidth - 100;
    
    promptArchitectureData.forEach((prompt, index) => {
      // Check if we need a new page
      if (yPos + barSpacing > pageHeight - 25) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Level label
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Level ${prompt.level}`, 20, yPos + 4.5);
      
      // Progress bar background
      pdf.setFillColor(243, 244, 246);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(50, yPos, barWidth, barHeight, 1, 1, 'FD');
      
      if (prompt.totalScore !== undefined) {
        // Use 3-color gradient based on level, not score
        const levelColor = getPromptLevelColor(prompt.level);
        const fillWidth = (prompt.totalScore / 100) * barWidth;
        
        // Progress bar fill
        pdf.setFillColor(levelColor[0], levelColor[1], levelColor[2]);
        if (fillWidth > 0) {
          pdf.roundedRect(50, yPos, fillWidth, barHeight, 1, 1, 'F');
        }
        
        // Score text on the right
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
        pdf.text(`${prompt.totalScore}`, 50 + barWidth + 5, yPos + 4.5);
        
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        pdf.text('/100', 50 + barWidth + 12, yPos + 4.5);
      } else {
        // Not completed
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(156, 163, 175);
        pdf.text('Not completed', 50 + barWidth / 2, yPos + 8, { align: 'center' });
      }
      
      yPos += barSpacing;
    });
    
    // Ensure "Assessed Dimensions" stays on same page - check for 25mm of content
    const assessedDimensionsHeight = 25;
    if (yPos + assessedDimensionsHeight > pageHeight - 20) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos += 8;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Assessed Dimensions:', 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Clarity (20%) • Structure (20%) • Context Relevance (20%) • Creativity (20%) • Iterative Improvement (20%)', 20, yPos);
    yPos += 6;
    
    // Workplace Impact at bottom of Prompt Architecture section
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Directly correlates with AI productivity. Skilled prompt engineers extract 3-5x more value from AI tools,', 52, yPos);
    yPos += 4;
    pdf.text('solve complex problems faster, and produce higher-quality AI-assisted outputs.', 20, yPos);
    yPos += 10;
    
    pdf.setTextColor(0, 0, 0);
  }
  
  // ========== AIQ ASSESSMENT ==========
  const aiqResult = candidate.results?.find((r: any) => 
    r.assessmentType === 'aiq' && r.status === 'completed'
  );
  
  // Extract AIQ score from either totalScore or scores['Algorithmic Integrity'] (for compatibility)
  const aiqScore = aiqResult?.totalScore ?? aiqResult?.scores?.['Algorithmic Integrity'] ?? null;
  
  if (aiqResult && aiqScore !== null) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    yPos += 2;
    
    // What It Measures description
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94); // Green for AIQ
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring', 52, yPos);
    yPos += 4;
    pdf.text('(0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).', 20, yPos);
    yPos += 8;
    
    // Get band interpretation for display
    const aiqBand = getAIQBandInterpretation(aiqScore);
    const aiqBandColor = getAIQBandColor(aiqScore);
    
    // Score display - compact centered box with band color (70% size)
    const boxWidth = 56;
    const boxHeight = 18;
    const boxX = (pageWidth - boxWidth) / 2;
    
    // Create proper light background tint (10% of band color mixed with white)
    const bgTint: [number, number, number] = [
      Math.round(255 - (255 - aiqBandColor[0]) * 0.15),
      Math.round(255 - (255 - aiqBandColor[1]) * 0.15),
      Math.round(255 - (255 - aiqBandColor[2]) * 0.15)
    ];
    pdf.setFillColor(bgTint[0], bgTint[1], bgTint[2]);
    pdf.setDrawColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
    
    // Score number
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.text(`${aiqScore}%`, pageWidth / 2, yPos + 7, { align: 'center' });
    
    // Band title (no range shown)
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(aiqBand.title, pageWidth / 2, yPos + 14, { align: 'center' });
    
    yPos += boxHeight + 6;
    
    // Add band description below the box
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(55, 65, 81);
    const descLines = pdf.splitTextToSize(aiqBand.description, pageWidth - 50);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, pageWidth / 2, yPos + (idx * 4), { align: 'center' });
    });
    yPos += descLines.length * 4 + 6;
    
    // Workplace Impact at bottom of AIQ section
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94); // Green for AIQ
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives', 52, yPos);
    yPos += 4;
    pdf.text('with operational realities, making them valuable for AI governance and deployment oversight roles.', 20, yPos);
    yPos += 10;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== OPTIONAL PAGE: JOB ROLE COMPARISON ==========
  if (roleComparison) {
    pdf.addPage();
    addHeader(pdf, pageWidth);
    
    yPos = 35;
    yPos = addSectionHeader(pdf, `JOB ROLE FIT ANALYSIS: ${roleComparison.role.name.toUpperCase()}`, yPos, pageWidth);
    yPos += 10;
    
    // Overall fit score with large visual
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(20, yPos, pageWidth - 40, 45, 3, 3, 'FD');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Overall Role Fit Score', pageWidth / 2, yPos + 12, { align: 'center' });
    
    const fitColor = roleComparison.alignment.overallFit >= 80 
      ? [34, 197, 94] 
      : roleComparison.alignment.overallFit >= 60 
      ? [59, 130, 246]
      : [249, 115, 22];
    
    pdf.setFontSize(32);
    pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
    pdf.text(`${roleComparison.alignment.overallFit}%`, pageWidth / 2, yPos + 28, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    const fitLabel = roleComparison.alignment.overallFit >= 80 
      ? 'Excellent Match' 
      : roleComparison.alignment.overallFit >= 60 
      ? 'Good Potential'
      : 'Needs Development';
    pdf.text(fitLabel, pageWidth / 2, yPos + 38, { align: 'center' });
    
    yPos += 55;
    pdf.setTextColor(0, 0, 0);
    
    // Skill alignments
    yPos = addSectionHeader(pdf, 'SKILL-BY-SKILL ALIGNMENT', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Skill', 25, yPos);
    pdf.text('Your Score', 100, yPos);
    pdf.text('Required', 130, yPos);
    pdf.text('Gap', 160, yPos);
    pdf.text('Status', pageWidth - 25, yPos, { align: 'right' });
    yPos += 2;
    
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    
    roleComparison.alignment.skillAlignments?.forEach((skill, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, 8, 'F');
      }
      
      pdf.setTextColor(17, 24, 39);
      const skillName = skill.skillName.length > 25 ? skill.skillName.substring(0, 22) + '...' : skill.skillName;
      pdf.text(skillName, 25, yPos + 2);
      pdf.text(`${skill.candidateScore}`, 100, yPos + 2);
      pdf.text(`${skill.requiredScore}`, 130, yPos + 2);
      
      const gapColor = skill.gap <= 0 ? [34, 197, 94] : [239, 68, 68];
      pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
      const gapText = skill.gap > 0 ? `-${skill.gap}` : `+${Math.abs(skill.gap)}`;
      pdf.text(gapText, 160, yPos + 2);
      
      const statusColor = skill.alignment === 'excellent' 
        ? [34, 197, 94] 
        : skill.alignment === 'good' 
        ? [59, 130, 246]
        : [249, 115, 22];
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(skill.alignment.toUpperCase(), pageWidth - 25, yPos + 2, { align: 'right' });
      
      yPos += 8;
    });
    
    pdf.setTextColor(0, 0, 0);
    yPos += 5;
    
    // Strengths and development areas
    if (yPos > pageHeight - 100) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'KEY STRENGTHS FOR THIS ROLE', yPos, pageWidth);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Areas where candidate meets or exceeds requirements', 25, yPos + 4);
    yPos += 10;
    
    roleComparison.alignment.strengths?.slice(0, 5).forEach((strength, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 10, 2, 2, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(34, 197, 94);
      pdf.text('✓', 30, yPos + 6);
      
      pdf.setTextColor(17, 24, 39);
      const lines = pdf.splitTextToSize(strength, pageWidth - 70);
      pdf.text(lines[0], 38, yPos + 6);
      
      yPos += 12;
    });
    
    yPos += 5;
    yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS FOR THIS ROLE', yPos, pageWidth);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Skills that may benefit from additional development or support', 25, yPos + 4);
    yPos += 10;
    
    roleComparison.alignment.gaps?.slice(0, 5).forEach((area, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 10, 2, 2, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(249, 115, 22);
      pdf.text('!', 30, yPos + 6);
      
      pdf.setTextColor(17, 24, 39);
      const lines = pdf.splitTextToSize(area, pageWidth - 70);
      pdf.text(lines[0], 38, yPos + 6);
      
      yPos += 12;
    });
    
    // Recommendations
    if (roleComparison.alignment.recommendations) {
      yPos += 5;
      
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      yPos = addSectionHeader(pdf, 'HIRING RECOMMENDATIONS', yPos, pageWidth);
      yPos += 5;
      
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 20, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const recLines = pdf.splitTextToSize(roleComparison.alignment.recommendations, pageWidth - 60);
      recLines.forEach((line: string, lineIndex: number) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          addHeader(pdf, pageWidth);
          yPos = 35;
        }
        pdf.text(line, 30, yPos + 7 + (lineIndex * 4));
      });
      
      yPos += Math.max(20, recLines.length * 4 + 10);
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== RECOMMENDATIONS SECTION ==========
  // Always start FINAL CANDIDATE RECOMMENDATIONS on a new page for better layout
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 45; // Start lower to give header breathing room
  
  // Calculate assessment-level scores for role recommendations
  const fitAvgScore = fitResultSummary?.scores 
    ? Math.round(Object.values(fitResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(fitResultSummary.scores).length)
    : null;
  const aiReadinessAvgScore = aiReadinessResultSummary?.scores
    ? Math.round(Object.values(aiReadinessResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(aiReadinessResultSummary.scores).length)
    : null;
  const promptArchAvgScore = promptArchResultSummary?.totalScore ?? null;
  const aiqAvgScore = aiqResultSummary?.totalScore ?? null;
  
  // Generate role-based recommendations
  const roleRecs = generateRoleRecommendations(
    skills,
    avgScore,
    fitAvgScore,
    aiReadinessAvgScore,
    promptArchAvgScore,
    aiqAvgScore
  );
  
  // Recommendations Section Header
  yPos = addSectionHeader(pdf, 'FINAL CANDIDATE RECOMMENDATIONS', yPos, pageWidth);
  yPos += 5;
  
  const recMargin = 25;
  const recContentWidth = pageWidth - recMargin * 2;
  const recLineHeight = 4;
  
  // Helper to draw a recommendation section as plain paragraphs (no boxes)
  const drawRecSection = (
    title: string,
    items: string[],
    titleColor: [number, number, number]
  ): void => {
    // Check for page break before starting section
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 45;
    }
    
    // Draw title
    const drawTitle = () => {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
      pdf.text(title, recMargin, yPos);
      yPos += 5;
    };
    
    drawTitle();
    
    // Draw items as plain paragraphs
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    items.forEach(item => {
      const lines = pdf.splitTextToSize(`• ${item}`, recContentWidth);
      lines.forEach((line: string, lineIdx: number) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          addBackgroundPattern(pdf, pageWidth, pageHeight);
          addHeader(pdf, pageWidth);
          yPos = 45;
          // Re-render title with "(continued)" suffix on new page
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
          pdf.text(`${title} (continued)`, recMargin, yPos);
          yPos += 5;
          // Reset text styling for items
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(55, 65, 81);
        }
        pdf.text(line, recMargin + 3, yPos);
        yPos += recLineHeight;
      });
      yPos += 1; // Small gap between items
    });
    
    yPos += 6; // Gap before next section
  };
  
  // Development recommendations content - focus on actual improvement areas
  const weakestSkills = [...skills].sort((a, b) => a.score - b.score).slice(0, 2);
  const developmentItems: string[] = [];
  
  // Add specific recommendations based on weakest areas
  weakestSkills.forEach(skill => {
    if (skill.score < 50) {
      developmentItems.push(`Priority development in ${skill.name} through targeted training and practical exercises.`);
    } else if (skill.score < 70) {
      developmentItems.push(`Strengthen ${skill.name} skills through hands-on projects and peer collaboration.`);
    } else {
      developmentItems.push(`Refine ${skill.name} expertise with advanced certifications or specialized workshops.`);
    }
  });
  
  // Add overall recommendation based on average score
  if (avgScore < 50) {
    developmentItems.push('Consider structured AI literacy programs to build foundational competencies.');
  } else if (avgScore < 70) {
    developmentItems.push('Seek mentorship opportunities to accelerate growth in identified development areas.');
  } else {
    developmentItems.push('Pursue leadership training to translate technical strengths into team impact.');
  }
  
  // Draw all sections as plain paragraphs
  drawRecSection('MOST SUITABLE ROLES', roleRecs.suitableRoles, [30, 58, 138]); // Dark blue
  drawRecSection('WHERE THIS CANDIDATE WOULD THRIVE', roleRecs.thrivingEnvironments, [16, 185, 129]); // Green
  drawRecSection('ROLE STRENGTHS', roleRecs.roleStrengths, [139, 92, 246]); // Purple
  drawRecSection('DEVELOPMENT RECOMMENDATIONS', developmentItems, [234, 88, 12]); // Orange
  
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
  const roleLabel = roleComparison ? `-${roleComparison.role.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}` : '';
  savePdfMobile(pdf, `humanmetrix-report-${safeCandidateName}${roleLabel}-${timestamp}.pdf`);
}

// Capture radar chart from DOM
export async function captureRadarChart(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element ${elementId} not found`);
    return null;
  }
  
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
}
