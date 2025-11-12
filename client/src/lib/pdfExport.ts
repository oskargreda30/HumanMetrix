import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FIT_SKILLS, AI_READINESS_SKILLS } from './assessmentSkills';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { applyBodyText, applySubheading, applyHeading, applySmallText, PDF_SPACING } from './pdfStyles';

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
    }> | null;
    aiReadinessSkillAlignments?: Array<{
      skillName: string;
      candidateScore: number;
      requiredScore: number;
      gap: number;
      alignment: string;
    }> | null;
    strengths: string[];
    gaps: string[];
  };
}

// Helper to add subtle background pattern to page
function addBackgroundPattern(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  // White background
  pdf.setFillColor(255, 255, 255); // White
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add page border
  pdf.setDrawColor(191, 219, 254); // Light blue border
  pdf.setLineWidth(0.5);
  pdf.rect(5, 5, pageWidth - 10, pageHeight - 10);
  pdf.setLineWidth(0.2);
  
}

// Helper to add header to each page
function addHeader(pdf: jsPDF, pageWidth: number) {
  // Gradient header background (dark to lighter blue) - increased height to 40mm
  pdf.setFillColor(30, 58, 138); // Dark blue
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  // Add subtle gradient effect with lighter overlay
  pdf.setFillColor(37, 99, 235, 0.3); // Semi-transparent lighter blue
  pdf.rect(0, 0, pageWidth * 0.6, 40, 'F');
  
  // HumanMetrix Logo (full logo image, centered with blue line)
  // Logo center at y=20 (same as blue line center)
  try {
    pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', 10, 3, 34, 34);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  // Separator line - repositioned to center at y=20
  pdf.setDrawColor(96, 165, 250);
  pdf.setLineWidth(0.5);
  pdf.line(48, 14, 48, 26);
  
  // Company name and tagline - repositioned
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 52, 18);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(191, 219, 254); // Light blue
  pdf.text('AI-Powered Assessment Platform', 52, 24);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to add footer to each page
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  pdf.setDrawColor(220, 220, 220);
  pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
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
  pdf.setFillColor(243, 244, 246);
  pdf.rect(15, yPosition - 3, pageWidth - 30, 10, 'F');
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(title, 18, yPosition + 4);
  pdf.setTextColor(0, 0, 0);
  
  return yPosition + 13;
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
    return 50; // Updated to account for 40mm header + spacing
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
    fontSize = 7,
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
  yPos = 50;
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
  
  // Compact Candidate Cards
  yPos = 95;
  data.candidates.forEach((candidate, index) => {
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : 'No Name';
    
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    const cardY = yPos + (index * 26);
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(25, cardY, pageWidth - 50, 20, 2, 2, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`CANDIDATE ${index + 1}`, 30, cardY + 6);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    const shortName = name.length > 25 ? name.substring(0, 23) + '...' : name;
    pdf.text(shortName, 30, cardY + 12);
    
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const shortEmail = candidate.user.email.length > 30 ? candidate.user.email.substring(0, 28) + '...' : candidate.user.email;
    pdf.text(shortEmail, 30, cardY + 17);
    
    const avgScore = data.averageScores[index];
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(`${avgScore}`, pageWidth - 30, cardY + 11, { align: 'right' });
    
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Avg', pageWidth - 30, cardY + 16, { align: 'right' });
  });
  
  yPos += (data.candidates.length * 26) + 8;
  pdf.setTextColor(0, 0, 0);
  
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
  
  // Calculate dynamic column widths
  const tableStartX = 20;
  const assessmentColWidth = 50;
  const availableWidth = pageWidth - tableStartX - 10;
  const candidateColWidth = Math.max(35, (availableWidth - assessmentColWidth) / data.candidates.length);
  const rowHeight = 7;
  
  // Header row
  const headerWidths = [assessmentColWidth, ...Array(data.candidates.length).fill(candidateColWidth)];
  const headerTexts = ['Assessment', ...data.candidates.map(c => getCandidateName(c))];
  drawTableRow(pdf, tableStartX, yPos, headerWidths, headerTexts, rowHeight, {
    isBold: true,
    fontSize: 7,
    fillColor: [249, 250, 251],
    textColor: [17, 24, 39]
  });
  yPos += rowHeight;
  
  // Data rows
  assessmentNames.forEach((aName, aIndex) => {
    const rowTexts = [aName];
    
    data.candidates.forEach((_, candIndex) => {
      const isCompleted = (assessmentData[aIndex]?.[candIndex] ?? null) !== null;
      rowTexts.push(isCompleted ? '✓' : '—');
    });
    
    drawTableRow(pdf, tableStartX, yPos, headerWidths, rowTexts, rowHeight, {
      fontSize: 7,
      textColor: [75, 85, 99]
    });
    yPos += rowHeight;
  });
  
  yPos += 3;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: RADAR CHARTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 50;
  
  // FIT Assessment Radar Charts
  const hasFIT = data.fitAssessments?.some(a => a !== null);
  if (hasFIT && data.fitChartImages) {
    yPos = addSectionHeader(pdf, 'FIT ASSESSMENT COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    const fitCharts = data.fitChartImages.filter(img => img !== null);
    const chartsPerRow = Math.min(fitCharts.length, 2);
    const chartWidth = (pageWidth - 30) / chartsPerRow;
    const chartHeight = 65;
    
    fitCharts.forEach((image, index) => {
      if (!image) return;
      const xPos = 15 + (index % chartsPerRow) * chartWidth;
      const chartYPos = yPos + Math.floor(index / chartsPerRow) * (chartHeight + 5);
      
      pdf.addImage(image, 'PNG', xPos, chartYPos, chartWidth - 5, chartHeight);
    });
    
    yPos += Math.ceil(fitCharts.length / chartsPerRow) * (chartHeight + 5) + 3;
    
    // FIT Score Table - PROPER TABLE FORMAT
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('FIT Skills Comparison', 20, yPos);
    yPos += 5;
    
    // Show ALL FIT skills using exact key matching
    const fitSkillKeys = FIT_SKILLS.map(s => s.key);
    const fitSkillData = data.skillComparison.filter(skill => 
      fitSkillKeys.includes(skill.skillName)
    );
    
    const fitTableStartX = 20;
    const fitSkillColWidth = 60;
    const fitAvailableWidth = pageWidth - fitTableStartX - 10;
    const fitScoreColWidth = Math.max(25, (fitAvailableWidth - fitSkillColWidth) / data.candidates.length);
    const fitRowHeight = 6;
    
    // Header row
    const fitHeaderWidths = [fitSkillColWidth, ...Array(data.candidates.length).fill(fitScoreColWidth)];
    const fitHeaderTexts = ['Skill', ...data.candidates.map(c => getCandidateName(c))];
    drawTableRow(pdf, fitTableStartX, yPos, fitHeaderWidths, fitHeaderTexts, fitRowHeight, {
      isBold: true,
      fontSize: 6.5,
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
        fontSize: 6.5,
        textColor: [55, 65, 81]
      });
      yPos += fitRowHeight;
    });
    
    yPos += 5;
  }
  
  // AI Readiness Radar Charts
  const hasAI = data.aiReadinessAssessments?.some(a => a !== null);
  if (hasAI && data.aiChartImages) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 50;
    }
    
    yPos = addSectionHeader(pdf, 'AI READINESS COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    const aiCharts = data.aiChartImages.filter(img => img !== null);
    const chartsPerRow = Math.min(aiCharts.length, 2);
    const chartWidth = (pageWidth - 30) / chartsPerRow;
    const chartHeight = 65;
    
    aiCharts.forEach((image, index) => {
      if (!image) return;
      const xPos = 15 + (index % chartsPerRow) * chartWidth;
      const chartYPos = yPos + Math.floor(index / chartsPerRow) * (chartHeight + 5);
      
      pdf.addImage(image, 'PNG', xPos, chartYPos, chartWidth - 5, chartHeight);
    });
    
    yPos += Math.ceil(aiCharts.length / chartsPerRow) * (chartHeight + 5) + 3;
    
    // AI Readiness Score Table - PROPER TABLE FORMAT
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('AI Readiness Skills Comparison', 20, yPos);
    yPos += 5;
    
    // Show ALL AI Readiness skills using exact key matching
    const aiSkillKeys = AI_READINESS_SKILLS.map(s => s.key);
    const aiSkillData = data.skillComparison.filter(skill => 
      aiSkillKeys.includes(skill.skillName)
    );
    
    const aiTableStartX = 20;
    const aiSkillColWidth = 60;
    const aiAvailableWidth = pageWidth - aiTableStartX - 10;
    const aiScoreColWidth = Math.max(25, (aiAvailableWidth - aiSkillColWidth) / data.candidates.length);
    const aiRowHeight = 6;
    
    // Header row
    const aiHeaderWidths = [aiSkillColWidth, ...Array(data.candidates.length).fill(aiScoreColWidth)];
    const aiHeaderTexts = ['Skill', ...data.candidates.map(c => getCandidateName(c))];
    drawTableRow(pdf, aiTableStartX, yPos, aiHeaderWidths, aiHeaderTexts, aiRowHeight, {
      isBold: true,
      fontSize: 6.5,
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
        fontSize: 6.5,
        textColor: [55, 65, 81]
      });
      yPos += aiRowHeight;
    });
    
    yPos += 5;
  }
  
  // ========== PAGE 3: DETAILED COMPARISONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 50;
  
  // AIQ Summary
  const hasAIQ = data.aiqAssessments?.some(a => a !== null);
  if (hasAIQ) {
    yPos = addSectionHeader(pdf, 'AIQ (ALGORITHMIC INTEGRITY)', yPos, pageWidth);
    yPos += 2;
    
    pdf.setFontSize(7);
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
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${aiqData.totalScore}/100`, 100, yPos);
        const passed = aiqData.totalScore >= 70;
        pdf.setTextColor(passed ? 34 : 239, passed ? 197 : 68, passed ? 94 : 68);
        pdf.text(passed ? 'Passed' : 'Developing', 130, yPos);
      } else {
        pdf.setTextColor(150, 150, 150);
        pdf.text('N/A', 100, yPos);
      }
      yPos += 6;
    });
    yPos += 10; // ADDED BREATHING ROOM (10mm spacing)
  }
  
  // Prompt Architecture - Total Level Scores
  const hasPrompt = data.promptArchitectureAssessments?.some(a => a !== null);
  if (hasPrompt) {
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE COMPARISON', yPos, pageWidth);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Progressive difficulty levels (1-7) testing prompt design mastery', 25, yPos + 1);
    yPos += 5;
    
    // Table header
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Level', 25, yPos);
    
    // Candidate name headers with color coding
    const scoreColWidth = (pageWidth - 80) / data.candidates.length;
    data.candidates.forEach((candidate, index) => {
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      const name = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
        : `Candidate ${index + 1}`;
      const shortName = name.length > 15 ? name.substring(0, 13) + '...' : name;
      pdf.text(shortName, 65 + (index * scoreColWidth), yPos);
    });
    yPos += 4;
    
    // Render all 7 levels
    for (let level = 1; level <= 7; level++) {
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`Level ${level}`, 25, yPos + 3);
      
      // Candidate scores with bars
      data.candidates.forEach((candidate, candIndex) => {
        const promptData = data.promptArchitectureAssessments?.[candIndex];
        if (promptData && promptData.levels && promptData.levels[level - 1]) {
          const levelData = promptData.levels[level - 1];
          const score = levelData.totalScore || 0;
          const maxScore = 100;
          const barWidth = 30;
          const barLength = (score / maxScore) * barWidth;
          const barX = 65 + (candIndex * scoreColWidth);
          
          // Background bar
          pdf.setFillColor(229, 231, 235);
          pdf.rect(barX + 15, yPos + 0.5, barWidth, 4, 'F');
          
          // Score bar with candidate color
          const candidateColor = CANDIDATE_COLORS[candIndex] || [100, 100, 100];
          pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
          pdf.rect(barX + 15, yPos + 0.5, barLength, 4, 'F');
          
          // Score text
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(`${score}`, barX, yPos + 3);
        } else {
          const barX = 65 + (candIndex * scoreColWidth);
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text('—', barX, yPos + 3);
        }
      });
      
      yPos += 7;
    }
    
    yPos += 3;
  }
  
  // Top 5 Skills Comparison - Horizontal Bar Chart
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 50;
  }
  
  yPos = addSectionHeader(pdf, 'TOP 5 SKILLS COMPARISON', yPos, pageWidth);
  yPos += 3;
  
  // Get top 5 skills based on average scores
  const skillsWithAvg = data.skillComparison.map(skill => {
    const validScores = skill.scores.filter((s): s is number => s !== null);
    const avg = validScores.length > 0 ? validScores.reduce((a, b) => a + b, 0) / validScores.length : 0;
    return { ...skill, avg };
  });
  const top5Skills = skillsWithAvg.sort((a, b) => b.avg - a.avg).slice(0, 5);
  
  const barChartWidth = 110;
  const barChartStartX = 60;
  
  top5Skills.forEach((skill, index) => {
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const skillName = skill.skillName.length > 20 ? skill.skillName.substring(0, 18) + '...' : skill.skillName;
    pdf.text(skillName, 22, yPos + 4);
    
    // Draw grouped bars for each candidate
    const barHeight = 3.5;
    const barGap = 0.5;
    const groupHeight = (data.candidates.length * (barHeight + barGap));
    
    skill.scores.forEach((score, candIndex) => {
      if (score !== null) {
        const candidateColor = CANDIDATE_COLORS[candIndex] || [100, 100, 100];
        const barLength = (score / 100) * barChartWidth;
        const barY = yPos + (candIndex * (barHeight + barGap));
        
        // Background bar
        pdf.setFillColor(240, 240, 240);
        pdf.rect(barChartStartX, barY, barChartWidth, barHeight, 'F');
        
        // Score bar
        pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
        pdf.rect(barChartStartX, barY, barLength, barHeight, 'F');
        
        // Score label
        pdf.setFontSize(5);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${score}`, barChartStartX + barChartWidth + 2, barY + 2.5);
      }
    });
    
    yPos += groupHeight + 3;
  });
  
  // Legend - IMPROVED WITH FULL NAMES
  yPos += 2;
  pdf.setFontSize(6);
  
  // Calculate legend item widths dynamically to prevent cut-off
  const legendStartX = 25;
  const legendItemSpacing = Math.min(60, (pageWidth - legendStartX - 10) / data.candidates.length);
  
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    const xPos = legendStartX + (index * legendItemSpacing);
    
    // Color circle (matching new marker style)
    pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.circle(xPos + 1.5, yPos + 1.5, 1.5, 'F');
    
    // Full candidate name (truncate only if extremely long)
    pdf.setTextColor(75, 85, 99);
    const fullName = getCandidateName(candidate);
    const displayName = fullName.length > 18 ? fullName.substring(0, 16) + '...' : fullName;
    pdf.text(displayName, xPos + 5, yPos + 2.5);
  });
  
  yPos += 8;
  pdf.setTextColor(0, 0, 0);
  
  // ========== EMPLOYER RECOMMENDATION ==========
  yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
  
  yPos = addSectionHeader(pdf, 'HIRING RECOMMENDATION', yPos, pageWidth);
  yPos += 5;
  
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
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  const recommendationText = `Based on the comprehensive assessment data, the following analysis provides an objective overview of each candidate's performance:\n\n`;
  
  const lines = pdf.splitTextToSize(recommendationText, pageWidth - 50);
  lines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 4;
  });
  
  // Individual candidate summaries
  rankedCandidates.forEach((candidate, index) => {
    yPos = ensurePageSpace(pdf, yPos, 25, pageHeight, pageWidth);
    
    const candidateColor = CANDIDATE_COLORS[data.candidates.findIndex(c => getCandidateName(c) === candidate.name)] || [100, 100, 100];
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`${candidate.name}`, 25, yPos);
    yPos += 4;
    
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
      yPos = ensurePageSpace(pdf, yPos, 5, pageHeight, pageWidth);
      pdf.text(line, 25, yPos);
      yPos += 4;
    });
    
    yPos += 3;
  });
  
  // Closing statement
  yPos = ensurePageSpace(pdf, yPos, 15, pageHeight, pageWidth);
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(6.5);
  pdf.setTextColor(107, 114, 128);
  const closingText = 'This recommendation is generated based solely on assessment data and should be considered alongside interviews, references, and other evaluation criteria for comprehensive hiring decisions.';
  const closingLines = pdf.splitTextToSize(closingText, pageWidth - 50);
  closingLines.forEach((line: string) => {
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
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE', 25, yPos + 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(candidateName, 25, yPos + 16);
  
  pdf.setFontSize(7);
  pdf.setTextColor(107, 114, 128);
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
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('TARGET ROLE', roleX + 5, yPos + 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(data.role.name, roleX + 5, yPos + 16);
  
  if (data.role.description) {
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
    const descLines = pdf.splitTextToSize(data.role.description, (pageWidth - 55) / 2);
    // Render full description
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, roleX + 5, yPos + 22 + (idx * 2.5));
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
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${data.alignment.overallFit}%`, 25, yPos + 4);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(fitLabel, 50, yPos + 4);
  
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
  
  // ========== KEY STRENGTHS (on page 1, compact two-column) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  applySmallText(pdf);
  pdf.text('Areas where candidate meets or exceeds requirements', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
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
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
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
  
  yPos = 50;
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(7);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skill-by-skill alignment with role requirements', 20, yPos);
  yPos += 6;
  
  // Helper function to render skill line chart
  const renderSkillSection = (skills: any[], sectionTitle: string, iconColor: [number, number, number]) => {
    if (!skills || skills.length === 0) return;
    
    // Section title with icon
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
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
    pdf.setFontSize(6);
    pdf.setTextColor(107, 114, 128);
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
      
      // Skill label on left - better positioned
      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      const skillName = skill.skillName.length > 26 ? skill.skillName.substring(0, 24) + '...' : skill.skillName;
      pdf.text(skillName, chartMarginLeft - 3, skillY + 1, { align: 'right' });
      
      // Calculate positions
      const requiredX = chartMarginLeft + (skill.requiredScore / 100) * chartWidth;
      const candidateX = chartMarginLeft + (skill.candidateScore / 100) * chartWidth;
      
      // Draw line connecting required to candidate score
      const lineColor = skill.candidateScore >= skill.requiredScore ? [34, 197, 94] : [239, 68, 68];
      pdf.setDrawColor(lineColor[0], lineColor[1], lineColor[2]);
      pdf.setLineWidth(0.8);
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
      pdf.setFontSize(5);
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
    pdf.setFontSize(6);
    pdf.setTextColor(55, 65, 81);
    
    // Required score legend (hollow circle)
    pdf.setFillColor(255, 255, 255);
    pdf.circle(chartMarginLeft + 5, yPos, 1.5, 'F');
    pdf.setDrawColor(107, 114, 128);
    pdf.setLineWidth(1);
    pdf.circle(chartMarginLeft + 5, yPos, 1.5, 'D');
    pdf.text('Required Score', chartMarginLeft + 11, yPos + 1);
    
    // Candidate score legend (filled circle)
    pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
    const legendX = chartMarginLeft + 52;
    pdf.circle(legendX, yPos, 1.5, 'F');
    pdf.text('Candidate Score', legendX + 6, yPos + 1);
    
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
  
  pdf.setTextColor(0, 0, 0);
  
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
        'Proceed to technical interview stage to validate practical skills',
        'Conduct behavioral interview focusing on development areas identified',
        'Check professional references with emphasis on areas of strength',
        'Consider for final candidate pool'
      ]
    : [
        'Schedule additional screening to assess cultural fit and motivation',
        'Explore development potential through scenario-based questions',
        'Consider alternative roles that better match current skill profile',
        'Review against other candidate pool members before proceeding'
      ];
  
  nextSteps.forEach(step => {
    yPos = ensurePageSpace(pdf, yPos, 5, pageHeight, pageWidth);
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
