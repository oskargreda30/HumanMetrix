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
  
  // OVERALL FIT SCORE (on page 1)
  yPos = 125;
  yPos = addSectionHeader(pdf, 'OVERALL FIT SCORE', yPos, pageWidth);
  yPos += 8;
  
  const fitColor = data.alignment.overallFit >= 80 ? [34, 197, 94] : 
                   data.alignment.overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = data.alignment.overallFit >= 80 ? 'Excellent Fit' : 
                   data.alignment.overallFit >= 60 ? 'Good Fit' : 'Needs Development';
  
  // Compact score display card
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.setLineWidth(0.8);
  pdf.roundedRect(30, yPos, pageWidth - 60, 50, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(42);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${data.alignment.overallFit}%`, pageWidth / 2, yPos + 26, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fitLabel, pageWidth / 2, yPos + 38, { align: 'center' });
  
  yPos += 58;
  pdf.setTextColor(0, 0, 0);
  
  // Visual gauge (compact)
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Alignment Strength', 30, yPos);
  yPos += 4;
  
  const barWidth = pageWidth - 60;
  const barHeight = 6;
  
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(30, yPos, barWidth, barHeight, 2, 2, 'F');
  
  const fillWidth = (data.alignment.overallFit / 100) * barWidth;
  pdf.setFillColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.roundedRect(30, yPos, fillWidth, barHeight, 2, 2, 'F');
  
  yPos += 12;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILL ALIGNMENT ANALYSIS + STRENGTHS ==========
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
  
  // Compact table header
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
  
  // Limit to top 12 skills to ensure page 2 fits
  const topSkills = data.alignment.skillAlignments.slice(0, 12);
  
  pdf.setFont('helvetica', 'normal');
  topSkills.forEach((skill, index) => {
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
    
    // Mini progress bar
    const miniBarWidth = 18;
    const miniBarHeight = 2.5;
    const barX = 165;
    
    pdf.setFillColor(229, 231, 235);
    pdf.rect(barX, yPos - 1.5, miniBarWidth, miniBarHeight, 'F');
    
    const skillFillWidth = (skill.candidateScore / 100) * miniBarWidth;
    pdf.setFillColor(scorePerf.color[0], scorePerf.color[1], scorePerf.color[2]);
    pdf.rect(barX, yPos - 1.5, skillFillWidth, miniBarHeight, 'F');
    
    yPos += 7;
  });
  
  yPos += 6;
  pdf.setTextColor(0, 0, 0);
  
  // ========== STRENGTHS (Two-Column Layout for space efficiency) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(6);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Areas where candidate meets or exceeds requirements', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  // Render strengths in two columns for better space utilization
  const colWidth = (pageWidth - 45) / 2;
  const leftX = 20;
  const rightX = leftX + colWidth + 5;
  let leftY = yPos;
  let rightY = yPos;
  let onLeftCol = true;
  
  data.alignment.strengths.forEach((strength, index) => {
    const currentX = onLeftCol ? leftX : rightX;
    let currentY = onLeftCol ? leftY : rightY;
    
    pdf.setTextColor(34, 197, 94);
    pdf.text('✓', currentX + 2, currentY);
    
    pdf.setTextColor(22, 101, 52);
    const strengthLines = pdf.splitTextToSize(strength, colWidth - 8);
    strengthLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, currentX + 6, currentY + (lineIdx * 3));
    });
    
    const itemHeight = strengthLines.length * 3 + 2;
    
    if (onLeftCol) {
      leftY += itemHeight;
    } else {
      rightY += itemHeight;
    }
    
    onLeftCol = !onLeftCol;
  });
  
  yPos = Math.max(leftY, rightY) + 2;
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 3: DEVELOPMENT AREAS + RECOMMENDATIONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(6);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skills requiring improvement for better role alignment', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  
  // Render gaps in two columns for better space utilization
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
    pdf.text('⚠', currentX + 2, currentY);
    
    pdf.setTextColor(127, 29, 29);
    const gapLines = pdf.splitTextToSize(gap, gapColWidth - 8);
    gapLines.forEach((line: string, lineIdx: number) => {
      pdf.text(line, currentX + 6, currentY + (lineIdx * 3));
    });
    
    const itemHeight = gapLines.length * 3 + 2;
    
    if (onGapLeftCol) {
      gapLeftY += itemHeight;
    } else {
      gapRightY += itemHeight;
    }
    
    onGapLeftCol = !onGapLeftCol;
  });
  
  yPos = Math.max(gapLeftY, gapRightY) + 4;
  pdf.setTextColor(0, 0, 0);
  
  // ========== RECOMMENDATIONS (Phased Densification Pipeline) ==========
  yPos = addSectionHeader(pdf, 'RECOMMENDATIONS', yPos, pageWidth);
  yPos += 1.5;
  
  pdf.setFontSize(5.5);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Strategic guidance for role fit and development', 20, yPos);
  yPos += 3.5;
  
  pdf.setTextColor(55, 65, 81);
  
  // Two-column layout for recommendations
  const recColWidth = (pageWidth - 45) / 2;
  const recLeftX = 20;
  const recRightX = recLeftX + recColWidth + 5;
  let recLeftY = yPos;
  let recRightY = yPos;
  let onRecLeftCol = true;
  
  const recParagraphs = data.alignment.recommendations.split('\n\n');
  let truncatedCount = 0;
  
  recParagraphs.forEach((paragraph, index) => {
    // Determine current column and position
    let currentX = onRecLeftCol ? recLeftX : recRightX;
    let currentY = onRecLeftCol ? recLeftY : recRightY;
    
    // Smart column switching: use column with more space
    if (onRecLeftCol && recRightY < recLeftY - 8) {
      onRecLeftCol = false;
      currentX = recRightX;
      currentY = recRightY;
    } else if (!onRecLeftCol && recLeftY < recRightY - 8) {
      onRecLeftCol = true;
      currentX = recLeftX;
      currentY = recLeftY;
    }
    
    // Phased densification: try progressively denser layouts
    const availableVertical = pageHeight - currentY - 16;
    let layoutSuccess = false;
    
    // Profile 1: Normal spacing (6.5pt font, 2.2pt leading)
    if (!layoutSuccess && availableVertical > 30) {
      pdf.setFontSize(6.5);
      const recLines1 = pdf.splitTextToSize(paragraph.trim(), recColWidth - 6);
      const height1 = recLines1.length * 2.2 + 3;
      
      if (currentY + height1 < pageHeight - 16) {
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(currentX, currentY, recColWidth, height1, 1.5, 1.5, 'FD');
        recLines1.forEach((line: string, idx: number) => {
          pdf.text(line, currentX + 2.5, currentY + 2.5 + (idx * 2.2));
        });
        currentY += height1 + 1.5;
        layoutSuccess = true;
      }
    }
    
    // Profile 2: Tight spacing (6pt font, 1.9pt leading)
    if (!layoutSuccess && availableVertical > 20) {
      pdf.setFontSize(6);
      const recLines2 = pdf.splitTextToSize(paragraph.trim(), recColWidth - 6);
      const height2 = recLines2.length * 1.9 + 2.5;
      
      if (currentY + height2 < pageHeight - 16) {
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(currentX, currentY, recColWidth, height2, 1.5, 1.5, 'FD');
        recLines2.forEach((line: string, idx: number) => {
          pdf.text(line, currentX + 2.5, currentY + 2 + (idx * 1.9));
        });
        currentY += height2 + 1.5;
        layoutSuccess = true;
      }
    }
    
    // Profile 3: Condensed typography (5.5pt font, 1.7pt leading)
    if (!layoutSuccess && availableVertical > 12) {
      pdf.setFontSize(5.5);
      const recLines3 = pdf.splitTextToSize(paragraph.trim(), recColWidth - 5);
      const height3 = recLines3.length * 1.7 + 2;
      
      if (currentY + height3 < pageHeight - 16) {
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(currentX, currentY, recColWidth, height3, 1, 1, 'FD');
        recLines3.forEach((line: string, idx: number) => {
          pdf.text(line, currentX + 2, currentY + 1.8 + (idx * 1.7));
        });
        currentY += height3 + 1.2;
        layoutSuccess = true;
      }
    }
    
    // Profile 4: Bullet conversion (sentence-level fragments with 5pt font, 1.6pt leading)
    if (!layoutSuccess && availableVertical > 8) {
      pdf.setFontSize(5);
      // Split paragraph into sentences using regex
      const sentences = paragraph.trim().split(/\.\s+(?=[A-Z0-9])/).filter(s => s.trim().length > 0);
      const bullets = sentences.map(s => `• ${s.trim()}${s.endsWith('.') ? '' : '.'}`);
      
      // Calculate total height for bulletized version
      let bulletHeight = 1;
      bullets.forEach(bullet => {
        const bulletLines = pdf.splitTextToSize(bullet, recColWidth - 5);
        bulletHeight += bulletLines.length * 1.6 + 0.5;
      });
      bulletHeight += 1;
      
      if (currentY + bulletHeight < pageHeight - 16) {
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(currentX, currentY, recColWidth, bulletHeight, 0.8, 0.8, 'FD');
        
        let bulletY = currentY + 1.5;
        bullets.forEach(bullet => {
          const bulletLines = pdf.splitTextToSize(bullet, recColWidth - 5);
          bulletLines.forEach((line: string, idx: number) => {
            pdf.text(line, currentX + 2, bulletY + (idx * 1.6));
          });
          bulletY += bulletLines.length * 1.6 + 0.5;
        });
        
        currentY += bulletHeight + 1;
        layoutSuccess = true;
      }
    }
    
    // Update column heights if we successfully placed the paragraph
    if (layoutSuccess) {
      if (onRecLeftCol) {
        recLeftY = currentY;
      } else {
        recRightY = currentY;
      }
      // Alternate columns for balanced layout
      onRecLeftCol = !onRecLeftCol;
    } else {
      // Track truncated paragraphs
      truncatedCount++;
    }
  });
  
  // Add truncation marker if any paragraphs were skipped
  if (truncatedCount > 0) {
    const markerY = Math.min(recLeftY, recRightY);
    if (markerY < pageHeight - 18) {
      pdf.setFontSize(5);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`[${truncatedCount} recommendation${truncatedCount > 1 ? 's' : ''} truncated due to space limits]`, 20, markerY + 2);
    }
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
