import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FIT_SKILLS, AI_READINESS_SKILLS, ROLE_DEFINITIONS } from './assessmentSkills';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { applyBodyText, applySubheading, applyHeading, applySmallText, applyLabelText, PDF_SPACING } from './pdfStyles';
import { getAIQBandInterpretation } from '@/data/aiq-questions';

interface CandidateData {
  user: {
    firstName?: string;
    lastName?: string;
    email: string;
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
    cohortBenchmarks?: Record<string, { percentile: number; totalCandidates: number }> | null;
    dataRiskIndicators?: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }> | null;
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
  pdf.text('HUMANMETRIX', 34, 16);
  
  // Tagline - positioned below company name
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 34, 24);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to add footer to each page
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
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

// Helper to determine performance level
function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Excellent', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Good', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Fair', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
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
  
  // ========== PAGE 1: COVER + SUMMARY ==========
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
  
  pdf.setTextColor(0, 0, 0);
  
  yPos = 95;
  
  // Helper function to get candidate name
  function getCandidateName(candidate: any): string {
    return candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : candidate.user.email.split('@')[0];
  }
  
  // Assessment Completion Status - IMPROVED TABLE
  yPos = addSectionHeader(pdf, 'COMPLETION STATUS', yPos, pageWidth);
  yPos += 3;
  
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
        // Draw green filled box
        pdf.setFillColor(34, 197, 94); // Green-500
        const boxSize = 3;
        const boxX = currentX + (candidateColWidth - boxSize) / 2;
        const boxY = yPos + (rowHeight - boxSize) / 2;
        pdf.roundedRect(boxX, boxY, boxSize, boxSize, 0.5, 0.5, 'F');
      } else {
        // Draw red cross or dash
        pdf.setTextColor(239, 68, 68); // Red-500
        applySmallText(pdf);
        pdf.setTextColor(239, 68, 68);
        pdf.text('—', currentX + candidateColWidth / 2, yPos + rowHeight * 0.6, { align: 'center' });
        pdf.setTextColor(75, 85, 99);
      }
      
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
  
  // Add explanation text
  applySmallText(pdf);
  const compositeExplanation = 'This ranking applies equal weights across FIT, AI Readiness, Prompt Architecture, and AIQ assessments to deliver a balanced composite score. Higher scores indicate stronger overall performance across all evaluated competencies.';
  const splitCompositeExplanation = pdf.splitTextToSize(compositeExplanation, pageWidth - 40);
  pdf.text(splitCompositeExplanation, 20, yPos);
  yPos += splitCompositeExplanation.length * 4 + 5;
  
  // Calculate composite scores with equal 25% weights
  const calculatePDFCompositeScore = (candidateIndex: number): number => {
    const assessmentData: Array<{ score: number; weight: number }> = [];
    const equalWeight = 25; // 100% / 4 = 25% each
    
    // FIT average
    const fitData = data.fitAssessments?.[candidateIndex];
    if (fitData) {
      const fitScores = Object.values(fitData.scores);
      if (fitScores.length > 0) {
        const fitAvg = fitScores.reduce((a, b) => a + b, 0) / fitScores.length;
        assessmentData.push({ score: fitAvg, weight: equalWeight });
      }
    }
    
    // AI Readiness average
    const aiData = data.aiReadinessAssessments?.[candidateIndex];
    if (aiData) {
      const aiScores = Object.values(aiData.scores);
      if (aiScores.length > 0) {
        const aiAvg = aiScores.reduce((a, b) => a + b, 0) / aiScores.length;
        assessmentData.push({ score: aiAvg, weight: equalWeight });
      }
    }
    
    // Prompt Architecture
    const promptData = data.promptArchitectureAssessments?.[candidateIndex];
    if (promptData) {
      assessmentData.push({ score: promptData.totalScore, weight: equalWeight });
    }
    
    // AIQ
    const aiqData = data.aiqAssessments?.[candidateIndex];
    if (aiqData) {
      assessmentData.push({ score: aiqData.totalScore, weight: equalWeight });
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
  const rankColWidths = [15, 60, 30, 30, 30]; // Rank, Name, Composite, Avg, Status
  const rankRowHeight = 7;
  
  // Header
  drawTableRow(pdf, rankTableStartX, yPos, rankColWidths, 
    ['Rank', 'Candidate', 'Composite', 'Avg Score', 'Status'], rankRowHeight, {
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
    const shortName = name.length > 18 ? name.substring(0, 16) + '...' : name;
    const avgScore = data.averageScores[ranking.candidateIndex];
    
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
    pdf.text(`${ranking.score}`, rankTableStartX + 75 + 15, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
    // Avg score
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${avgScore}`, rankTableStartX + 105 + 15, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
    // Status badge
    const statusColor = status === 'Excellent' ? [34, 197, 94] :
                        status === 'Strong' ? [59, 130, 246] :
                        status === 'Good' ? [245, 158, 11] : [107, 114, 128];
    pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.text(status, rankTableStartX + 135 + 15, yPos + rankRowHeight / 2 + 1, { align: 'center' });
    
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
  
  // Note about weights
  applySmallText(pdf);
  pdf.setFont('helvetica', 'italic');
  pdf.text('* Composite score calculated with equal weight for each assessment type', 20, yPos);
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
    yPos += 3;
    
    const fitCharts = data.fitChartImages.filter(img => img !== null);
    const chartsPerRow = Math.min(fitCharts.length, 2);
    const columnWidth = (pageWidth - 30) / chartsPerRow;
    const chartWidth = 78; // 4:3 aspect ratio for better horizontal fill
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
      const rowTexts = [skill.skillName];
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
  
  // AI Readiness Radar Charts
  const hasAI = data.aiReadinessAssessments?.some(a => a !== null);
  if (hasAI && data.aiChartImages) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 32;
    }
    
    yPos = addSectionHeader(pdf, 'AI READINESS COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    const aiCharts = data.aiChartImages.filter(img => img !== null);
    const aiChartsPerRow = Math.min(aiCharts.length, 2);
    const aiColumnWidth = (pageWidth - 30) / aiChartsPerRow;
    const aiChartWidth = 78; // 4:3 aspect ratio for better horizontal fill
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
      const rowTexts = [skill.skillName];
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
    
    // Use larger dimensions - 150mm height for bigger radar chart
    const imgProps = pdf.getImageProperties(data.overallSkillsChartImage);
    const maxWidth = pageWidth - 30; // Wider margins for bigger chart
    const maxHeight = 150; // Larger height for bigger chart display
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
    
    yPos = addSectionHeader(pdf, 'AIQ (ALGORITHMIC INTEGRITY)', yPos, pageWidth);
    yPos += 2;
    
    applySmallText(pdf);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Candidate', 25, yPos);
    pdf.text('Score', 100, yPos);
    pdf.text('Status', 130, yPos);
    yPos += 5;
    
    data.candidates.forEach((candidate, index) => {
      const aiqData = data.aiqAssessments?.[index];
      pdf.setFont('helvetica', 'normal');
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      
      const name = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
        : `Candidate ${index + 1}`;
      const shortName = name.length > 18 ? name.substring(0, 16) + '...' : name;
      pdf.text(shortName, 25, yPos);
      
      if (aiqData) {
        const aiqBand = getAIQBandInterpretation(aiqData.totalScore);
        // Get band-specific color
        const getBandColor = (score: number): [number, number, number] => {
          if (score >= 80) return [34, 197, 94];   // Green
          if (score >= 60) return [59, 130, 246];  // Blue
          if (score >= 40) return [245, 158, 11];  // Amber
          if (score >= 20) return [249, 115, 22];  // Orange
          return [239, 68, 68];                     // Red
        };
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${aiqData.totalScore}/100`, 100, yPos);
        const bandColor = getBandColor(aiqData.totalScore);
        pdf.setTextColor(bandColor[0], bandColor[1], bandColor[2]);
        pdf.text(aiqBand.title, 130, yPos);
      } else {
        pdf.setTextColor(150, 150, 150);
        pdf.text('N/A', 100, yPos);
      }
      yPos += 6;
    });
    
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
      
      pdf.setFontSize(7.5);
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
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Progressive difficulty levels (1-7) testing prompt design mastery', 25, yPos + 2);
    yPos += 12; // More breathing room before levels table
    
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
  yPos += 3;
  
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
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  
  // ========== ENHANCED ANALYSIS PAGE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
  
  // --- ROLE SUITABILITY ANALYSIS (only if a role is selected) ---
  // Default role weights used only if we need them for later calculations
  const roleWeights: Record<string, number> = data.selectedRole && ROLE_DEFINITIONS[data.selectedRole]
    ? ROLE_DEFINITIONS[data.selectedRole].weights
    : {};
  
  if (data.selectedRole && ROLE_DEFINITIONS[data.selectedRole]) {
    const selectedRoleDef = ROLE_DEFINITIONS[data.selectedRole];
    
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    yPos = addSectionHeader(pdf, `ROLE SUITABILITY: ${selectedRoleDef.name.toUpperCase()}`, yPos, pageWidth);
    yPos += 3;
    
    // Role description
    applySmallText(pdf);
    pdf.setFont('helvetica', 'italic');
    pdf.text(selectedRoleDef.description, 20, yPos);
    yPos += 5;
  
  // Calculate role suitability
  const calculateRoleSuitabilityPDF = (candidateIndex: number): number => {
    const skills = getAllCandidateSkillsPDF(candidateIndex);
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(roleWeights).forEach(([skillName, weight]) => {
      const score = skills[skillName];
      if (score !== undefined) {
        weightedSum += score * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  };
  
  // Draw role fit scores
  const roleTableStartX = 20;
  const roleColWidths = [60, ...Array(data.candidates.length).fill(Math.min(40, (pageWidth - 80) / data.candidates.length))];
  
  // Header
  drawTableRow(pdf, roleTableStartX, yPos, roleColWidths,
    ['Role Fit Score', ...data.candidates.map(c => getCandidateName(c).substring(0, 12))], 6, {
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
  pdf.rect(roleXOffset, yPos, roleColWidths[0], 8, 'S');
  pdf.setTextColor(55, 65, 81);
  pdf.text('Suitability %', roleXOffset + 2, yPos + 5);
  roleXOffset += roleColWidths[0];
  
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
    
    pdf.rect(roleXOffset, yPos, roleColWidths[index + 1], 8, 'F');
    pdf.setDrawColor(200, 200, 200);
    pdf.rect(roleXOffset, yPos, roleColWidths[index + 1], 8, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${score}%`, roleXOffset + roleColWidths[index + 1] / 2, yPos + 5, { align: 'center' });
    
    roleXOffset += roleColWidths[index + 1];
  });
  yPos += 12; // 8mm for row height + 4mm padding before recommendation box
  
  // Role Suitability Explanation
  const roleScoresSorted = data.candidates
    .map((c, i) => ({ 
      name: getCandidateName(c), 
      score: roleFitScores[i], 
      index: i,
      skills: getAllCandidateSkillsPDF(i)
    }))
    .sort((a, b) => b.score - a.score);
  
  if (roleScoresSorted.length >= 2) {
    const topRole = roleScoresSorted[0];
    const secondRole = roleScoresSorted[1];
    const topWeightedSkills = Object.keys(roleWeights).slice(0, 2);
    
    // Skill benefit descriptions
    const skillBenefits: Record<string, string> = {
      'Domain Expertise': 'enables strategic guidance on industry-specific AI applications',
      'Collaboration & Communication': 'facilitates stakeholder alignment and cross-functional coordination',
      'High Agency': 'drives proactive problem-solving and initiative',
      'AI Literacy & Prompt Engineering': 'ensures effective AI system implementation',
      'Critical Thinking & Problem-Solving': 'supports analytical decision-making',
      'Interpersonal Agility': 'enables effective navigation of team dynamics',
      'Responsible AI & Ethical Awareness': 'ensures AI governance compliance',
      'Growth Mindset': 'supports adaptation to emerging technologies',
      'Resilience': 'maintains performance under pressure',
    };
    
    // Find advantage skills
    const advantageSkills = Object.keys(roleWeights).filter(skillName => {
      const topScore = topRole.skills[skillName] ?? 0;
      const secondScore = secondRole.skills[skillName] ?? 0;
      return topScore > secondScore;
    }).slice(0, 2);
    
    // Calculate box height based on content
    const boxHeight = advantageSkills.length > 0 ? 22 : 14;
    
    pdf.setFillColor(248, 250, 252);
    pdf.roundedRect(20, yPos, pageWidth - 40, boxHeight, 2, 2, 'F');
    
    // Recommendation header with score
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`Recommendation: ${topRole.name}`, 24, yPos + 5);
    pdf.text(`${topRole.score}%`, pageWidth - 28, yPos + 5, { align: 'right' });
    
    pdf.setFontSize(5.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`vs ${secondRole.score}%`, pageWidth - 28, yPos + 9, { align: 'right' });
    
    // Main explanation
    pdf.setFontSize(6);
    pdf.setTextColor(71, 85, 105);
    let roleText = `For ${selectedRoleDef.name}, scoring prioritizes ${topWeightedSkills[0]} (which ${skillBenefits[topWeightedSkills[0]] || 'contributes to role effectiveness'}) `;
    roleText += `and ${topWeightedSkills[1]} (which ${skillBenefits[topWeightedSkills[1]] || 'contributes to role effectiveness'}).`;
    
    const splitRoleText = pdf.splitTextToSize(roleText, pageWidth - 60);
    pdf.text(splitRoleText, 24, yPos + 10);
    
    // Key differentiator if applicable
    if (advantageSkills.length > 0) {
      const scoreDiff = topRole.score - secondRole.score;
      let diffText = `Key differentiator: ${topRole.name} demonstrates stronger performance in ${advantageSkills.join(' and ')}, `;
      diffText += `translating to a ${scoreDiff} percentage point lead in overall role fit.`;
      
      const splitDiffText = pdf.splitTextToSize(diffText, pageWidth - 48);
      pdf.text(splitDiffText, 24, yPos + 17);
    }
    
    yPos += boxHeight;
  }
  yPos += 5;
  } // End of role suitability conditional
  
  // ========== ROLE SUITABILITY SUMMARY (only if a role is selected) ==========
  if (data.selectedRole) {
    yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
    
    yPos = addSectionHeader(pdf, 'ROLE SUITABILITY SUMMARY', yPos, pageWidth);
    yPos += 3;
    
    // Role description - use the selected role name
    const roleName = ROLE_DEFINITIONS[data.selectedRole]?.name || 'Selected Role';
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`How candidates align with the ${roleName} role based on weighted skill requirements`, 20, yPos);
    yPos += 6;
    
    // Skill benefit descriptions for the role
    const roleBenefits: Record<string, string> = {
      'Domain Expertise': 'enables strategic guidance on industry-specific AI applications',
      'Collaboration & Communication': 'facilitates stakeholder alignment and cross-functional coordination',
      'High Agency': 'drives proactive problem-solving and initiative',
      'AI Literacy & Prompt Engineering': 'ensures effective AI system implementation',
      'Critical Thinking & Problem-Solving': 'supports analytical decision-making',
      'Interpersonal Agility': 'enables effective navigation of team dynamics',
      'Responsible AI & Ethical Awareness': 'ensures AI governance compliance',
      'Growth Mindset': 'supports adaptation to emerging technologies',
      'Resilience': 'maintains performance under pressure',
    };
    
    // Get role weights from the selected role
    const selectedRoleWeights = ROLE_DEFINITIONS[data.selectedRole]?.weights || roleWeights;
    
    // Get top 2 weighted skills for the role
    const topRoleSkills = Object.keys(selectedRoleWeights).slice(0, 2);
    
    // Role priority explanation
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    let roleExplanation = `For the ${roleName} role, scoring prioritizes ${topRoleSkills[0]} (which ${roleBenefits[topRoleSkills[0]] || 'contributes to role effectiveness'}) `;
    roleExplanation += `and ${topRoleSkills[1]} (which ${roleBenefits[topRoleSkills[1]] || 'contributes to role effectiveness'}).`;
    
    const roleExpLines = pdf.splitTextToSize(roleExplanation, pageWidth - 40);
    roleExpLines.forEach((line: string) => {
      pdf.text(line, 20, yPos);
      yPos += 4;
    });
    yPos += 3;
    
    // Recalculate role scores using the selected role weights
    const selectedRoleScores = data.candidates.map((candidate, index) => {
      const skills = getAllCandidateSkillsPDF(index);
      let weightedSum = 0;
      let totalWeight = 0;
      
      Object.entries(selectedRoleWeights).forEach(([skillName, weight]) => {
        const score = skills[skillName];
        if (score !== undefined) {
          weightedSum += score * weight;
          totalWeight += weight;
        }
      });
      
      return {
        name: getCandidateName(candidate),
        score: totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0,
        skills,
      };
    }).sort((a, b) => b.score - a.score);
    
    // Recommendation box
    if (selectedRoleScores.length >= 2) {
      const topCandidate = selectedRoleScores[0];
      const secondCandidate = selectedRoleScores[1];
      
      // Find advantage skills
      const candidateAdvantageSkills = Object.keys(selectedRoleWeights).filter(skillName => {
        const topScore = topCandidate.skills[skillName] ?? 0;
        const secondScore = secondCandidate.skills[skillName] ?? 0;
        return topScore > secondScore;
      }).slice(0, 2);
      
      const scoreDiff = topCandidate.score - secondCandidate.score;
      
      // Recommendation header box
      pdf.setFillColor(240, 249, 255);
      pdf.roundedRect(20, yPos, pageWidth - 40, 24, 2, 2, 'F');
      
      // Recommendation label
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 64, 175);
      pdf.text(`Recommendation: ${topCandidate.name}`, 25, yPos + 6);
      
      // Score display
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${topCandidate.score}%`, pageWidth - 35, yPos + 8, { align: 'right' });
      
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`vs ${secondCandidate.score}%`, pageWidth - 35, yPos + 12, { align: 'right' });
      
      // Key differentiator
      if (candidateAdvantageSkills.length > 0) {
        pdf.setFontSize(6.5);
        pdf.setTextColor(55, 65, 81);
        let diffText = `Key differentiator: ${topCandidate.name} demonstrates stronger performance in ${candidateAdvantageSkills.join(' and ')}, `;
        diffText += `translating to a ${scoreDiff} percentage point lead in overall role fit.`;
        
        const diffLines = pdf.splitTextToSize(diffText, pageWidth - 50);
        diffLines.forEach((line: string, i: number) => {
          pdf.text(line, 25, yPos + 16 + (i * 3.5));
        });
      }
      
      yPos += 28;
    }
    yPos += 5;
  }
  
  // ========== EMPLOYER RECOMMENDATION ==========
  yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
  
  yPos = addSectionHeader(pdf, 'HIRING RECOMMENDATION', yPos, pageWidth);
  yPos += 5;
  
  // Add Comparison Summary header for the selected role
  if (data.selectedRole) {
    const roleLabel = ROLE_DEFINITIONS[data.selectedRole]?.name ?? 'Selected Role';
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`Comparison Summary for ${roleLabel}`, 20, yPos);
    yPos += 8;
  }
  
  // Generate unbiased recommendation based on data
  const candidateAnalysis = data.candidates.map((candidate, index) => {
    const name = getCandidateName(candidate);
    const avgScore = data.averageScores[index];
    const completedCount = [
      data.fitAssessments?.[index],
      data.aiReadinessAssessments?.[index],
      data.promptArchitectureAssessments?.[index],
      data.aiqAssessments?.[index]
    ].filter(a => a !== null).length;
    
    // Find top skills
    const candidateSkills = data.skillComparison
      .map(skill => ({ name: skill.skillName, score: skill.scores[index] }))
      .filter(s => s.score !== null)
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, 3);
    
    return { name, avgScore, completedCount, topSkills: candidateSkills };
  });
  
  // Sort by average score to identify top performers
  const rankedCandidates = [...candidateAnalysis].sort((a, b) => b.avgScore - a.avgScore);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  const recommendationText = `Based on the comprehensive assessment data, the following analysis provides an objective overview of each candidate's performance:\n\n`;
  
  const lines = pdf.splitTextToSize(recommendationText, pageWidth - 50);
  lines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 5;
  });
  
  // Individual candidate summaries
  rankedCandidates.forEach((candidate, index) => {
    yPos = ensurePageSpace(pdf, yPos, 35, pageHeight, pageWidth);
    
    const candidateColor = CANDIDATE_COLORS[data.candidates.findIndex(c => getCandidateName(c) === candidate.name)] || [100, 100, 100];
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`${candidate.name}`, 25, yPos);
    yPos += 6;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const perfLevel = getPerformanceLevel(candidate.avgScore);
    const summary = `Average Score: ${candidate.avgScore}/100 (${perfLevel.label}) • Completed ${candidate.completedCount}/4 assessments\n` +
      `Key Strengths: ${candidate.topSkills.map(s => s.name).join(', ')}\n` +
      `Recommendation: ${candidate.avgScore >= 80 ? 'Strong candidate with demonstrated excellence across multiple competencies. Consider for roles requiring high performance and adaptability.' : 
        candidate.avgScore >= 70 ? 'Solid candidate with good overall performance. Suitable for most positions with potential for growth in identified development areas.' :
        candidate.avgScore >= 60 ? 'Developing candidate showing promise. May benefit from additional training or mentorship in lower-scoring areas.' :
        'Candidate shows foundational skills but may require significant development. Consider for entry-level positions or roles with comprehensive onboarding support.'}`
    
    const summaryLines = pdf.splitTextToSize(summary, pageWidth - 50);
    summaryLines.forEach((line: string) => {
      yPos = ensurePageSpace(pdf, yPos, 6, pageHeight, pageWidth);
      pdf.text(line, 25, yPos);
      yPos += 5;
    });
    
    yPos += 5;
  });
  
  // ========== RECOMMENDED NEXT STEPS ==========
  yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Recommended Next Steps:', 25, yPos);
  yPos += 8;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  const comparisonNextSteps = [
    'Conduct combined technical and behavioral interviews with shortlisted candidates to validate assessment findings',
    'Perform team fit analysis to understand how each candidate will integrate with the current or target team dynamics',
    'Check professional references with emphasis on areas of demonstrated strength',
    'Consider role-specific scenarios to assess practical application of identified skills'
  ];
  
  comparisonNextSteps.forEach(step => {
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
  
  yPos += 5;
  
  // ========== ADDITIONAL SERVICES ON REQUEST ==========
  // Force new page for this section
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 32;
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
  
  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  pdf.save(`comparison-report-${timestamp}.pdf`);
}

export async function exportRoleFitPDF(data: RoleFitData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  const candidateName = data.candidate.user.firstName || data.candidate.user.lastName
    ? `${data.candidate.user.firstName || ''} ${data.candidate.user.lastName || ''}`.trim()
    : 'Candidate';
  
  // ========== PAGE 1: COVER + OVERALL FIT SCORE ==========
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
  
  // Candidate & Role Information (compact, side-by-side)
  yPos = 85;
  
  // Candidate card (left)
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, (pageWidth - 45) / 2, 30, 2, 2, 'FD');
  
  applyLabelText(pdf);
  pdf.text('CANDIDATE', 25, yPos + 8);
  
  applySubheading(pdf);
  pdf.setTextColor(17, 24, 39);
  pdf.text(candidateName, 25, yPos + 16);
  
  applySmallText(pdf);
  pdf.text(data.candidate.user.email, 25, yPos + 22);
  
  // Role card (right) with dynamic height
  const roleX = (pageWidth + 5) / 2;
  
  // Calculate dynamic card height based on description
  let roleCardHeight = 30;
  let descLineCount = 0;
  if (data.role.description) {
    const tempDescLines = pdf.splitTextToSize(data.role.description, (pageWidth - 55) / 2);
    descLineCount = tempDescLines.length;
    roleCardHeight = Math.max(30, 20 + (descLineCount * 2.5));
  }
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(roleX, yPos, (pageWidth - 45) / 2, roleCardHeight, 2, 2, 'FD');
  
  applyLabelText(pdf);
  pdf.text('TARGET ROLE', roleX + 5, yPos + 8);
  
  applySubheading(pdf);
  pdf.setTextColor(17, 24, 39);
  pdf.text(data.role.name, roleX + 5, yPos + 16);
  
  if (data.role.description) {
    applySmallText(pdf);
    const descLines = pdf.splitTextToSize(data.role.description, (pageWidth - 55) / 2);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, roleX + 5, yPos + 22 + (idx * 3));
    });
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // OVERALL FIT SCORE (on page 1) - SMALLER VERSION
  yPos = 125;
  yPos = addSectionHeader(pdf, 'OVERALL FIT SCORE', yPos, pageWidth);
  yPos += 3;
  
  const fitColor = data.alignment.overallFit >= 80 ? [34, 197, 94] : 
                   data.alignment.overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = data.alignment.overallFit >= 80 ? 'Excellent Fit' : 
                   data.alignment.overallFit >= 60 ? 'Good Fit' : 'Needs Development';
  
  // Smaller inline score display (single line)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${data.alignment.overallFit}%`, 25, yPos + 4);
  
  applyBodyText(pdf);
  pdf.setTextColor(75, 85, 99);
  pdf.text(fitLabel, 52, yPos + 4);
  
  // Compact progress bar next to score
  const barX = 95;
  const barWidth = pageWidth - barX - 25;
  const barHeight = 4;
  
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(barX, yPos + 1, barWidth, barHeight, 1, 1, 'F');
  
  const fillWidth = (data.alignment.overallFit / 100) * barWidth;
  pdf.setFillColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.roundedRect(barX, yPos + 1, fillWidth, barHeight, 1, 1, 'F');
  
  yPos += 16;
  pdf.setTextColor(0, 0, 0);
  
  // ========== DATA QUALITY ALERTS (if any) ==========
  if (data.alignment.dataRiskIndicators && data.alignment.dataRiskIndicators.length > 0) {
    yPos = addSectionHeader(pdf, 'DATA QUALITY ALERTS', yPos, pageWidth);
    yPos += 2;
    
    // Calculate required height based on text wrapping
    const maxMsgWidth = pageWidth - 65;
    let totalHeight = 6;
    const wrappedMessages: string[][] = [];
    data.alignment.dataRiskIndicators.forEach((indicator) => {
      const lines = pdf.splitTextToSize(indicator.message, maxMsgWidth);
      wrappedMessages.push(lines);
      totalHeight += Math.max(5, lines.length * 3.5);
    });
    
    // Warning box background
    pdf.setFillColor(254, 243, 199); // Amber-50
    pdf.setDrawColor(251, 191, 36); // Amber-400
    pdf.roundedRect(20, yPos, pageWidth - 40, totalHeight, 2, 2, 'FD');
    yPos += 4;
    
    data.alignment.dataRiskIndicators.forEach((indicator, idx) => {
      // Severity badge
      const severityColors: Record<string, [number, number, number]> = {
        high: [239, 68, 68],
        medium: [234, 179, 8],
        low: [107, 114, 128]
      };
      const badgeColor = severityColors[indicator.severity] || severityColors.medium;
      
      pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      pdf.roundedRect(24, yPos - 2.5, 12, 4, 1, 1, 'F');
      
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(indicator.severity.toUpperCase(), 30, yPos, { align: 'center' });
      
      // Alert message with text wrapping
      applySmallText(pdf);
      pdf.setTextColor(127, 29, 29);
      const msgLines = wrappedMessages[idx];
      msgLines.forEach((line: string, lineIdx: number) => {
        pdf.text(line, 40, yPos + (lineIdx * 3.5));
      });
      yPos += Math.max(5, msgLines.length * 3.5);
    });
    
    yPos += 5;
    pdf.setTextColor(0, 0, 0);
  }
  
  // ========== KEY STRENGTHS (on page 1, compact two-column) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.text('Areas where candidate meets or exceeds requirements', 20, yPos);
  yPos += 6;
  
  applyBodyText(pdf);
  
  // Two-column layout for strengths
  const strengthColWidth = (pageWidth - 45) / 2;
  const strengthLeftX = 20;
  const strengthRightX = strengthLeftX + strengthColWidth + 5;
  let strengthLeftY = yPos;
  let strengthRightY = yPos;
  let onStrengthLeftCol = true;
  
  data.alignment.strengths.forEach((strength, index) => {
    const currentX = onStrengthLeftCol ? strengthLeftX : strengthRightX;
    let currentY = onStrengthLeftCol ? strengthLeftY : strengthRightY;
    
    pdf.setTextColor(34, 197, 94);
    pdf.text('✓', currentX + 1, currentY);
    
    pdf.setTextColor(22, 101, 52);
    const strengthLines = pdf.splitTextToSize(strength, strengthColWidth - 6);
    strengthLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, currentX + 4, currentY + (lineIdx * 3));
    });
    
    const itemHeight = strengthLines.length * 3 + 2;
    
    if (onStrengthLeftCol) {
      strengthLeftY += itemHeight;
    } else {
      strengthRightY += itemHeight;
    }
    
    onStrengthLeftCol = !onStrengthLeftCol;
  });
  
  yPos = Math.max(strengthLeftY, strengthRightY) + 6;
  pdf.setTextColor(0, 0, 0);
  
  // ========== DEVELOPMENT AREAS (on page 1, compact two-column) ==========
  yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.text('Skills requiring improvement for better role alignment', 20, yPos);
  yPos += 6;
  
  applyBodyText(pdf);
  
  // Two-column layout for gaps
  const gapColWidth = (pageWidth - 45) / 2;
  const gapLeftX = 20;
  const gapRightX = gapLeftX + gapColWidth + 5;
  let gapLeftY = yPos;
  let gapRightY = yPos;
  let onGapLeftCol = true;
  
  data.alignment.gaps.forEach((gap, index) => {
    const currentX = onGapLeftCol ? gapLeftX : gapRightX;
    let currentY = onGapLeftCol ? gapLeftY : gapRightY;
    
    pdf.setTextColor(239, 68, 68);
    pdf.text('⚠', currentX + 1, currentY);
    
    pdf.setTextColor(127, 29, 29);
    const gapLines = pdf.splitTextToSize(gap, gapColWidth - 6);
    gapLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, currentX + 4, currentY + (lineIdx * 3));
    });
    
    const itemHeight = gapLines.length * 3 + 2;
    
    if (onGapLeftCol) {
      gapLeftY += itemHeight;
    } else {
      gapRightY += itemHeight;
    }
    
    onGapLeftCol = !onGapLeftCol;
  });
  
  yPos = Math.max(gapLeftY, gapRightY);
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILL ALIGNMENT ANALYSIS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 32;
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 3;
  
  applySmallText(pdf);
  pdf.text('Skill-by-skill alignment with role requirements', 20, yPos);
  yPos += 6;
  
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
      
      // Skill label on left - better positioned with criticality badge
      applySmallText(pdf);
      const skillName = skill.skillName.length > 20 ? skill.skillName.substring(0, 18) + '...' : skill.skillName;
      
      // Add criticality badge before skill name
      const criticality = skill.criticality || 'important';
      const isCriticalGap = criticality === 'critical' && skill.gap > 0;
      
      if (criticality === 'critical') {
        // Red badge for critical skills
        pdf.setFillColor(isCriticalGap ? 239 : 220, isCriticalGap ? 68 : 38, isCriticalGap ? 68 : 38);
        pdf.roundedRect(5, skillY - 2, 8, 3.5, 0.5, 0.5, 'F');
        pdf.setFontSize(5);
        pdf.setTextColor(255, 255, 255);
        pdf.text('CRIT', 9, skillY + 0.5, { align: 'center' });
      } else if (criticality === 'nice-to-have') {
        // Gray badge for nice-to-have
        pdf.setFillColor(156, 163, 175);
        pdf.roundedRect(5, skillY - 2, 8, 3.5, 0.5, 0.5, 'F');
        pdf.setFontSize(5);
        pdf.setTextColor(255, 255, 255);
        pdf.text('N2H', 9, skillY + 0.5, { align: 'center' });
      }
      
      pdf.setTextColor(55, 65, 81);
      applySmallText(pdf);
      pdf.text(skillName, chartMarginLeft - 3, skillY + 1, { align: 'right' });
      
      // Calculate positions
      const requiredX = chartMarginLeft + (skill.requiredScore / 100) * chartWidth;
      const candidateX = chartMarginLeft + (skill.candidateScore / 100) * chartWidth;
      
      // Draw line connecting required to candidate score
      const lineColor = skill.candidateScore >= skill.requiredScore ? [34, 197, 94] : [239, 68, 68];
      pdf.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      pdf.setLineWidth(isCriticalGap ? 1.5 : 0.8);
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
    const legendX = chartMarginLeft + 55;
    pdf.circle(legendX, yPos, 1.5, 'F');
    pdf.text('Candidate Score', legendX + 6, yPos + 1);
    
    // Criticality legend
    const critLegendX = legendX + 50;
    pdf.setFillColor(220, 38, 38);
    pdf.roundedRect(critLegendX, yPos - 1.5, 8, 3.5, 0.5, 0.5, 'F');
    pdf.setFontSize(5);
    pdf.setTextColor(255, 255, 255);
    pdf.text('CRIT', critLegendX + 4, yPos + 0.5, { align: 'center' });
    applySmallText(pdf);
    pdf.setTextColor(55, 65, 81);
    pdf.text('= Critical Skill', critLegendX + 12, yPos + 1);
    
    yPos += 8;
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
  // Get top 4 critical skills from both FIT and AI Readiness alignments
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
    .slice(0, 4);
  
  if (criticalSkills.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'CRITICAL SKILLS ANALYSIS', yPos, pageWidth);
    yPos += 2;
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Deep analysis of the most critical skills required for this role', 20, yPos);
    yPos += 8;
    
    // Critical skills explanations
    const criticalSkillExplanations: Record<string, string> = {
      'Cognitive Flexibility': 'Essential for adapting to rapidly changing AI technologies and pivoting strategies when needed.',
      'Ethical Reasoning': 'Critical for ensuring AI implementations align with ethical standards and regulatory requirements.',
      'Collaboration & Communication': 'Vital for bridging technical and non-technical teams in AI initiatives.',
      'Decision-Making Under Uncertainty': 'Key for navigating the inherent unpredictability of AI outcomes.',
      'AI Literacy & Prompt Engineering': 'Core competency for effectively leveraging AI tools and systems.',
      'Data Fluency & Interpretation': 'Essential for understanding AI inputs and outputs to make informed decisions.',
      'Human-AI Collaboration': 'Critical for optimizing workflows that combine human and AI capabilities.',
      'Continuous Learning Orientation': 'Vital for staying current with rapidly evolving AI landscape.',
      'Risk Assessment & Mitigation': 'Important for identifying and managing AI-related risks.',
      'Creativity & Innovation': 'Key for finding novel applications and solutions using AI.',
      'Default': 'This skill is essential for successful performance in AI-integrated roles.'
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
      
      // Skill name with badge
      pdf.setFillColor(220, 38, 38);
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
      
      // Score comparison
      const gap = skill.candidateScore - skill.requiredScore;
      const gapColor: [number, number, number] = gap >= 0 ? [34, 197, 94] : [239, 68, 68];
      const gapText = gap >= 0 ? `+${gap} above requirement` : `${Math.abs(gap)} below requirement`;
      
      applyBodyText(pdf);
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Candidate Score: `, 25, yPos);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${skill.candidateScore}/100`, 60, yPos);
      pdf.setFont('helvetica', 'normal');
      pdf.text(` (Required: ${skill.requiredScore})`, 75, yPos);
      
      pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
      pdf.text(` ${gapText}`, 115, yPos);
      
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
  if (data.alignment.cohortBenchmarks && Object.keys(data.alignment.cohortBenchmarks).length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos += PDF_SPACING.medium;
    
    yPos = addSectionHeader(pdf, 'COHORT BENCHMARKING', yPos, pageWidth);
    yPos += 2;
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Candidate's performance compared to recent assessment cohort (last 50 candidates)", 20, yPos);
    yPos += 8;
    
    // Get all skills with benchmarks and group by assessment type
    const benchmarkedSkills = Object.entries(data.alignment.cohortBenchmarks);
    
    // Use explicit skill lists from alignments to categorize benchmarks correctly
    const fitSkillNameSet = new Set(
      (data.alignment.fitSkillAlignments || []).map(s => s.skillName)
    );
    const aiSkillNameSet = new Set(
      (data.alignment.aiReadinessSkillAlignments || []).map(s => s.skillName)
    );
    
    // Categorize based on which alignment array the skill appears in
    const fitBenchmarks = benchmarkedSkills.filter(([name]) => fitSkillNameSet.has(name));
    const aiBenchmarks = benchmarkedSkills.filter(([name]) => aiSkillNameSet.has(name));
    
    // Helper to calculate average percentile
    const calcAvgPercentile = (skills: [string, { percentile: number; totalCandidates: number }][]) => {
      if (skills.length === 0) return 0;
      return Math.round(skills.reduce((sum, [_, b]) => sum + b.percentile, 0) / skills.length);
    };
    
    // Overall assessment summary
    const allPercentiles = benchmarkedSkills.map(([_, b]) => b.percentile);
    const avgPercentile = Math.round(allPercentiles.reduce((a, b) => a + b, 0) / allPercentiles.length);
    const totalCandidates = benchmarkedSkills[0]?.[1]?.totalCandidates || 0;
    
    // Summary box
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'FD');
    
    applySubheading(pdf);
    pdf.setTextColor(17, 24, 39);
    pdf.text('Overall Cohort Position', 25, yPos + 6);
    
    // Overall percentile badge
    const overallColor: [number, number, number] = avgPercentile >= 75 ? [34, 197, 94] : 
      avgPercentile >= 50 ? [59, 130, 246] : [245, 158, 11];
    pdf.setFillColor(overallColor[0], overallColor[1], overallColor[2]);
    pdf.roundedRect(85, yPos + 2, 22, 6, 1, 1, 'F');
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    const percentileLabel = avgPercentile >= 50 ? `Top ${100 - avgPercentile}%` : `${avgPercentile}th`;
    pdf.text(percentileLabel, 96, yPos + 6, { align: 'center' });
    
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Based on comparison with ${totalCandidates} candidates in the cohort`, 25, yPos + 13);
    
    yPos += 25;
    
    // Assessment breakdown table
    const assessmentTypes = [
      { name: 'FIT Assessment (Behavioral)', skills: fitBenchmarks, avgPerc: calcAvgPercentile(fitBenchmarks) },
      { name: 'AI Readiness Assessment', skills: aiBenchmarks, avgPerc: calcAvgPercentile(aiBenchmarks) }
    ].filter(a => a.skills.length > 0);
    
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
      pdf.text(`${assessment.skills.length} skills`, 95, yPos + 5);
      
      pdf.setTextColor(17, 24, 39);
      pdf.text(`${assessment.avgPerc}th`, 140, yPos + 5);
      
      // Position badge
      const posColor: [number, number, number] = assessment.avgPerc >= 75 ? [34, 197, 94] : 
        assessment.avgPerc >= 50 ? [59, 130, 246] : [245, 158, 11];
      const posLabel = assessment.avgPerc >= 75 ? 'Above Avg' : 
        assessment.avgPerc >= 50 ? 'Average' : 'Below Avg';
      pdf.setFillColor(posColor[0], posColor[1], posColor[2]);
      pdf.roundedRect(165, yPos + 1, 18, 5, 1, 1, 'F');
      pdf.setFontSize(5.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(posLabel, 174, yPos + 4.5, { align: 'center' });
      
      yPos += 7;
    });
    
    yPos += 5;
    
    // Detailed skill breakdown in compact grid
    applySmallText(pdf);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Individual Skill Percentiles:', 20, yPos);
    yPos += 5;
    
    const colWidth = (pageWidth - 40) / 3;
    let col = 0;
    let rowStartY = yPos;
    
    benchmarkedSkills.forEach(([skillName, benchmark]) => {
      yPos = ensurePageSpace(pdf, rowStartY, 8, pageHeight, pageWidth);
      if (yPos !== rowStartY) {
        rowStartY = yPos;
        col = 0;
      }
      
      const x = 20 + (col * colWidth);
      const displayName = skillName.length > 16 ? skillName.substring(0, 14) + '...' : skillName;
      
      const percentile = benchmark.percentile;
      let percentileText: string;
      let badgeColor: [number, number, number];
      
      if (percentile >= 90) {
        percentileText = `Top ${Math.max(1, 100 - percentile)}%`;
        badgeColor = [34, 197, 94];
      } else if (percentile >= 75) {
        percentileText = `Top ${100 - percentile}%`;
        badgeColor = [59, 130, 246];
      } else if (percentile >= 50) {
        percentileText = `Top ${100 - percentile}%`;
        badgeColor = [107, 114, 128];
      } else {
        percentileText = `${percentile}th`;
        badgeColor = [245, 158, 11];
      }
      
      applySmallText(pdf);
      pdf.setTextColor(55, 65, 81);
      pdf.text(displayName, x, rowStartY);
      
      const badgeX = x + 38;
      pdf.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
      pdf.roundedRect(badgeX, rowStartY - 3, 15, 4, 1, 1, 'F');
      pdf.setFontSize(5.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(percentileText, badgeX + 7.5, rowStartY - 0.5, { align: 'center' });
      
      col++;
      if (col >= 3) {
        col = 0;
        rowStartY += 7;
      }
    });
    
    yPos = rowStartY + (col > 0 ? 10 : 5);
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
      
      // Coverage badge next to role name
      if (role.coverageLabel && role.coveragePercent) {
        const coverageColor: [number, number, number] = role.coverageLabel === 'High' ? [34, 197, 94] : 
          role.coverageLabel === 'Medium' ? [59, 130, 246] : [234, 179, 8];
        
        const nameWidth = pdf.getTextWidth(role.roleName);
        pdf.setFontSize(6.5);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(coverageColor[0], coverageColor[1], coverageColor[2]);
        pdf.text(`${role.coverageLabel} Confidence (${role.coveragePercent}%)`, 28 + nameWidth, yPos);
      }
      
      // Progress bar positioned to the right
      const barX = 130;
      const barWidth = 40;
      const barHeight = 4;
      
      pdf.setFillColor(229, 231, 235);
      pdf.rect(barX, yPos - 3, barWidth, barHeight, 'F');
      
      const fillColor: [number, number, number] = role.fitScore >= 70 ? [34, 197, 94] : role.fitScore >= 50 ? [59, 130, 246] : [234, 179, 8];
      pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.rect(barX, yPos - 3, (role.fitScore / 100) * barWidth, barHeight, 'F');
      
      // Adjusted score badge
      applyBodyText(pdf);
      pdf.setTextColor(fillColor[0], fillColor[1], fillColor[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${role.fitScore}%`, barX + barWidth + 3, yPos);
      
      // Show raw score if different
      if (role.rawFitScore && role.rawFitScore !== role.fitScore) {
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(107, 114, 128);
        pdf.text(`(Raw: ${role.rawFitScore}%)`, barX + barWidth + 15, yPos);
      }
      
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
  yPos += PDF_SPACING.medium;
  
  // Overall fit assessment
  const overallFit = data.alignment.overallFit;
  const perfLevel = getPerformanceLevel(overallFit);
  
  applyBodyText(pdf);
  
  let recommendationText = '';
  if (overallFit >= 85) {
    recommendationText = `${candidateName} demonstrates excellent alignment with the ${data.role.name} position, scoring ${overallFit}/100 overall. This candidate exhibits strong capabilities across the required competencies and would be a valuable addition to the team. The assessment data indicates readiness to contribute immediately with minimal onboarding time.`;
  } else if (overallFit >= 70) {
    recommendationText = `${candidateName} shows solid alignment with the ${data.role.name} role, achieving an overall score of ${overallFit}/100. This candidate meets most of the key requirements and demonstrates potential for growth in identified development areas. With targeted support in weaker skill areas, they could become a strong contributor to the team.`;
  } else if (overallFit >= 55) {
    recommendationText = `${candidateName} displays moderate alignment with the ${data.role.name} position, scoring ${overallFit}/100. While showing promise in certain competencies, this candidate would benefit from additional development in several key areas before fully meeting role requirements. Consider for positions where comprehensive training and mentorship are available.`;
  } else {
    recommendationText = `${candidateName} shows limited alignment with the ${data.role.name} role at this time, with an overall score of ${overallFit}/100. Significant skill gaps exist across multiple required competencies. This candidate may be better suited for entry-level positions or roles with different skill requirements. If proceeding, ensure robust onboarding and development plans are in place.`;
  }
  
  const recommendationLines = pdf.splitTextToSize(recommendationText, pageWidth - 50);
  recommendationLines.forEach((line: string) => {
    yPos = ensurePageSpace(pdf, yPos, 5, pageHeight, pageWidth);
    pdf.text(line, 25, yPos);
    yPos += 4;
  });
  
  yPos += PDF_SPACING.medium;
  
  // Key action items
  applySubheading(pdf);
  pdf.text('Recommended Next Steps:', 25, yPos);
  yPos += PDF_SPACING.medium;
  
  applyBodyText(pdf);
  const nextSteps = overallFit >= 70 
    ? [
        'Conduct combined technical and behavioral interviews to validate practical skills and assess development areas identified in this report',
        'Perform team fit analysis to understand how the candidate will integrate with the current or target team dynamics',
        'Check professional references with emphasis on areas of strength',
        'Consider for final candidate pool'
      ]
    : [
        'Schedule combined technical and behavioral screening to assess both skills and cultural fit',
        'Perform team fit analysis to evaluate potential integration with existing team structure and dynamics',
        'Explore development potential through scenario-based questions',
        'Consider alternative roles that better match current skill profile'
      ];
  
  nextSteps.forEach(step => {
    yPos = ensurePageSpace(pdf, yPos, 8, pageHeight, pageWidth);
    pdf.setTextColor(37, 99, 235);
    pdf.text('•', 27, yPos);
    pdf.setTextColor(55, 65, 81);
    const stepLines = pdf.splitTextToSize(step, pageWidth - 60);
    stepLines.forEach((line: string, idx: number) => {
      pdf.text(line, 32, yPos + (idx * 4));
    });
    yPos += (stepLines.length * 4) + 2;
  });
  
  yPos += PDF_SPACING.medium;
  
  // ========== ADDITIONAL SERVICES ON REQUEST ==========
  yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
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
  pdf.save(`role-fit-${safeCandidateName}-${safeRoleName}-${timestamp}.pdf`);
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

  // Footer
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
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
  pdf.save(`candidate-report-${safeCandidateName}-${timestamp}.pdf`);
}
