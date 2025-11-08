import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  // Add light gradient background
  pdf.setFillColor(249, 250, 251);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add subtle decorative dots in corners
  pdf.setFillColor(243, 244, 246);
  
  // Top left corner dots
  const dotSize = 0.5;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(5 + (i * 3), 30 + (j * 3), dotSize, 'F');
    }
  }
  
  // Top right corner dots
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(pageWidth - 15 + (i * 3), 30 + (j * 3), dotSize, 'F');
    }
  }
  
  // Bottom left corner dots
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(5 + (i * 3), pageHeight - 30 + (j * 3), dotSize, 'F');
    }
  }
  
  // Bottom right corner dots
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(pageWidth - 15 + (i * 3), pageHeight - 30 + (j * 3), dotSize, 'F');
    }
  }
}

// Helper to add header to each page
function addHeader(pdf: jsPDF, pageWidth: number) {
  pdf.setFillColor(17, 24, 39);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 15, 12);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('AI Assessment Platform', 15, 18);
  
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

// Candidate color palette for comparison
const CANDIDATE_COLORS = [
  [59, 130, 246],   // Blue
  [34, 197, 94],    // Green
  [249, 115, 22],   // Orange
];

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
    const cardY = yPos + (index * 35);
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(25, cardY, pageWidth - 50, 28, 2, 2, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`CANDIDATE ${index + 1}`, 30, cardY + 8);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(17, 24, 39);
    const shortName = name.length > 25 ? name.substring(0, 23) + '...' : name;
    pdf.text(shortName, 30, cardY + 15);
    
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    const shortEmail = candidate.user.email.length > 30 ? candidate.user.email.substring(0, 28) + '...' : candidate.user.email;
    pdf.text(shortEmail, 30, cardY + 21);
    
    const avgScore = data.averageScores[index];
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    const perf = getPerformanceLevel(avgScore);
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${avgScore}`, pageWidth - 35, cardY + 15, { align: 'right' });
    
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Avg', pageWidth - 35, cardY + 21, { align: 'right' });
  });
  
  yPos += (data.candidates.length * 35) + 10;
  pdf.setTextColor(0, 0, 0);
  
  // Assessment Completion Status
  yPos = addSectionHeader(pdf, 'COMPLETION STATUS', yPos, pageWidth);
  yPos += 3;
  
  const assessmentNames = ['FIT', 'AI Readiness', 'Prompt Arch.', 'AIQ'];
  const assessmentData = [
    data.fitAssessments,
    data.aiReadinessAssessments,
    data.promptArchitectureAssessments,
    data.aiqAssessments
  ];
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Assessment', 25, yPos);
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`C${index + 1}`, 80 + (index * 25), yPos);
  });
  pdf.setTextColor(0, 0, 0);
  yPos += 5;
  
  assessmentNames.forEach((aName, aIndex) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text(aName, 25, yPos);
    
    data.candidates.forEach((_, candIndex) => {
      const isCompleted = (assessmentData[aIndex]?.[candIndex] ?? null) !== null;
      pdf.setTextColor(isCompleted ? 34 : 200, isCompleted ? 197 : 200, isCompleted ? 94 : 200);
      pdf.text(isCompleted ? '✓' : '○', 85 + (candIndex * 25), yPos);
    });
    yPos += 6;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: RADAR CHARTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  
  // FIT Assessment Radar Charts
  const hasFIT = data.fitAssessments?.some(a => a !== null);
  if (hasFIT && data.fitChartImages) {
    yPos = addSectionHeader(pdf, 'FIT ASSESSMENT COMPARISON', yPos, pageWidth);
    yPos += 2;
    
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
    
    yPos += Math.ceil(fitCharts.length / chartsPerRow) * (chartHeight + 5) + 5;
  }
  
  // AI Readiness Radar Charts
  const hasAI = data.aiReadinessAssessments?.some(a => a !== null);
  if (hasAI && data.aiChartImages) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'AI READINESS COMPARISON', yPos, pageWidth);
    yPos += 2;
    
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
    
    yPos += Math.ceil(aiCharts.length / chartsPerRow) * (chartHeight + 5);
  }
  
  // ========== PAGE 3: DETAILED COMPARISONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  
  // Prompt Architecture Summary
  const hasPrompt = data.promptArchitectureAssessments?.some(a => a !== null);
  if (hasPrompt) {
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE', yPos, pageWidth);
    yPos += 2;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Candidate', 25, yPos);
    pdf.text('Total', 100, yPos);
    pdf.text('Percentile', 130, yPos);
    yPos += 5;
    
    data.candidates.forEach((candidate, index) => {
      const promptData = data.promptArchitectureAssessments?.[index];
      pdf.setFont('helvetica', 'normal');
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      
      const name = candidate.user.firstName || candidate.user.lastName
        ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
        : `Candidate ${index + 1}`;
      const shortName = name.length > 18 ? name.substring(0, 16) + '...' : name;
      pdf.text(shortName, 25, yPos);
      
      if (promptData) {
        pdf.setTextColor(17, 24, 39);
        pdf.text(`${promptData.totalScore}/100`, 100, yPos);
        pdf.text(`${promptData.percentile}th`, 130, yPos);
      } else {
        pdf.setTextColor(150, 150, 150);
        pdf.text('N/A', 100, yPos);
      }
      yPos += 6;
    });
    yPos += 3;
  }
  
  // AIQ Summary
  const hasAIQ = data.aiqAssessments?.some(a => a !== null);
  if (hasAIQ) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
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
    yPos += 3;
  }
  
  // Condensed Skill Comparison
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;
  }
  
  yPos = addSectionHeader(pdf, 'KEY SKILLS OVERVIEW', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skill', 22, yPos);
  
  const scoreColWidth = (pageWidth - 75) / data.candidates.length;
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`C${index + 1}`, 75 + (index * scoreColWidth), yPos);
  });
  yPos += 4;
  
  pdf.setFont('helvetica', 'normal');
  // Show only top 10 skills to guarantee fit within page
  const topSkills = data.skillComparison.slice(0, Math.min(10, data.skillComparison.length));
  
  topSkills.forEach((skill, skillIndex) => {
    if (skillIndex % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 3, pageWidth - 40, 5, 'F');
    }
    
    pdf.setFontSize(6);
    pdf.setTextColor(55, 65, 81);
    const skillName = skill.skillName.length > 25 ? skill.skillName.substring(0, 23) + '...' : skill.skillName;
    pdf.text(skillName, 22, yPos);
    
    skill.scores.forEach((score, index) => {
      if (score !== null) {
        const perf = getPerformanceLevel(score);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
        pdf.text(`${score}`, 78 + (index * scoreColWidth), yPos);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text('-', 78 + (index * scoreColWidth), yPos);
      }
    });
    
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
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE', 25, yPos + 8);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
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
  pdf.setFont('helvetica', 'normal');
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
  
  yPos += 12;
  pdf.setTextColor(0, 0, 0);
  
  // ========== KEY STRENGTHS (on page 1, compact two-column) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(6);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Areas where candidate meets or exceeds requirements', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  
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
  
  pdf.setFontSize(6);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skills requiring improvement for better role alignment', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  
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
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(7);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skill-by-skill alignment with role requirements', 20, yPos);
  yPos += 6;
  
  // Helper function to render skill table
  const renderSkillSection = (skills: any[], sectionTitle: string, iconColor: [number, number, number]) => {
    if (!skills || skills.length === 0) return;
    
    // Section title with icon
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(iconColor[0], iconColor[1], iconColor[2]);
    pdf.text(sectionTitle, 20, yPos);
    yPos += 5;
    
    // Table header
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Skill', 22, yPos);
    pdf.text('Score', 105, yPos);
    pdf.text('Req', 130, yPos);
    pdf.text('Gap', 150, yPos);
    
    yPos += 2;
    pdf.setDrawColor(220, 220, 220);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 4;
    
    pdf.setFont('helvetica', 'normal');
    skills.forEach((skill, index) => {
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, 7, 'F');
      }
      
      pdf.setFontSize(7);
      pdf.setTextColor(55, 65, 81);
      const skillName = skill.skillName.length > 35 ? skill.skillName.substring(0, 32) + '...' : skill.skillName;
      pdf.text(skillName, 22, yPos);
      
      const scorePerf = getPerformanceLevel(skill.candidateScore);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(scorePerf.color[0], scorePerf.color[1], scorePerf.color[2]);
      pdf.text(`${skill.candidateScore}`, 110, yPos);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${skill.requiredScore}`, 133, yPos);
      
      const gapText = skill.gap > 0 ? `-${skill.gap}` : `+${Math.abs(skill.gap)}`;
      const gapColor = skill.gap <= 0 ? [34, 197, 94] : [239, 68, 68];
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
      pdf.text(gapText, 153, yPos);
      
      // Mini progress bar - color coded based on comparison to required score
      const miniBarWidth = 18;
      const miniBarHeight = 2.5;
      const barX = 165;
      
      pdf.setFillColor(229, 231, 235);
      pdf.rect(barX, yPos - 1.5, miniBarWidth, miniBarHeight, 'F');
      
      const skillFillWidth = (skill.candidateScore / 100) * miniBarWidth;
      
      // Determine bar color based on comparison to required score
      let barColor: [number, number, number];
      if (skill.candidateScore > skill.requiredScore) {
        // Exceeds - green
        barColor = [34, 197, 94];
      } else if (skill.candidateScore === skill.requiredScore) {
        // Matches - blue
        barColor = [59, 130, 246];
      } else {
        // Under - light red
        barColor = [248, 113, 113];
      }
      
      pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
      pdf.rect(barX, yPos - 1.5, skillFillWidth, miniBarHeight, 'F');
      
      yPos += 7;
    });
    
    yPos += 8;
  };
  
  // Render FIT skills if available
  if (data.alignment.fitSkillAlignments && data.alignment.fitSkillAlignments.length > 0) {
    renderSkillSection(data.alignment.fitSkillAlignments, 'FIT ASSESSMENT SKILLS (Behavioral)', [59, 130, 246]);
  }
  
  // Render AI Readiness skills if available
  if (data.alignment.aiReadinessSkillAlignments && data.alignment.aiReadinessSkillAlignments.length > 0) {
    renderSkillSection(data.alignment.aiReadinessSkillAlignments, 'AI READINESS SKILLS (Technical)', [147, 51, 234]);
  }
  
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
  pdf.text(`Name: ${candidateName}`, 20, yPosition);
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
