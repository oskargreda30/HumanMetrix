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
  
  // ========== PAGE 1: COVER PAGE ==========
  addHeader(pdf, pageWidth);
  
  // Title Section with blue background
  yPos = 50;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 45, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CANDIDATE COMPARISON', pageWidth / 2, yPos + 15, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', pageWidth / 2, yPos + 25, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Candidates Information Cards
  yPos = 110;
  data.candidates.forEach((candidate, index) => {
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : 'No Name';
    
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    const cardY = yPos + (index * 45);
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(30, cardY, pageWidth - 60, 35, 3, 3, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.text(`CANDIDATE ${index + 1}`, 40, cardY + 10);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(17, 24, 39);
    pdf.text(name, 40, cardY + 18);
    
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(candidate.user.email, 40, cardY + 25);
    
    const avgScore = data.averageScores[index];
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const perf = getPerformanceLevel(avgScore);
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${avgScore}`, pageWidth - 50, cardY + 20, { align: 'right' });
    
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Avg Score', pageWidth - 50, cardY + 27, { align: 'right' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: ASSESSMENT OVERVIEW ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'ASSESSMENT OVERVIEW', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text('Assessment completion status for each candidate', 20, yPos);
  yPos += 10;
  
  // Assessment overview cards
  const assessmentNames = ['FIT Assessment', 'AI Readiness', 'Prompt Architecture', 'AIQ'];
  const assessmentData = [
    data.fitAssessments,
    data.aiReadinessAssessments,
    data.promptArchitectureAssessments,
    data.aiqAssessments
  ];
  
  const cardWidth = (pageWidth - 50) / data.candidates.length;
  
  data.candidates.forEach((candidate, candIndex) => {
    const candidateColor = CANDIDATE_COLORS[candIndex] || [100, 100, 100];
    const xPos = 20 + (candIndex * cardWidth);
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(xPos, yPos, cardWidth - 5, 70, 2, 2, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : `Candidate ${candIndex + 1}`;
    const shortName = name.length > 12 ? name.substring(0, 9) + '...' : name;
    pdf.text(shortName, xPos + (cardWidth - 5) / 2, yPos + 8, { align: 'center' });
    
    const completed = assessmentData.filter(ad => (ad?.[candIndex] ?? null) !== null).length;
    pdf.setFontSize(18);
    pdf.setTextColor(17, 24, 39);
    pdf.text(`${completed}/4`, xPos + (cardWidth - 5) / 2, yPos + 20, { align: 'center' });
    
    pdf.setFontSize(7);
    pdf.setTextColor(107, 114, 128);
    pdf.text('Completed', xPos + (cardWidth - 5) / 2, yPos + 26, { align: 'center' });
    
    pdf.setFontSize(7);
    assessmentNames.forEach((aName, aIndex) => {
      const isCompleted = (assessmentData[aIndex]?.[candIndex] ?? null) !== null;
      pdf.setTextColor(isCompleted ? 34 : 200, isCompleted ? 197 : 200, isCompleted ? 94 : 200);
      pdf.text(isCompleted ? '✓' : '○', xPos + 5, yPos + 35 + (aIndex * 7));
      pdf.setTextColor(75, 85, 99);
      const shortAssessName = aName.length > 10 ? aName.substring(0, 8) + '.' : aName;
      pdf.text(shortAssessName, xPos + 10, yPos + 35 + (aIndex * 7));
    });
  });
  
  yPos += 80;
  pdf.setTextColor(0, 0, 0);
  
  // ========== OVERALL SKILL COMPARISON ==========
  yPos = addSectionHeader(pdf, 'OVERALL SKILL COMPARISON', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skill-by-skill comparison across all candidates', 20, yPos);
  yPos += 8;
  
  // Table header
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Skill Name', 20, yPos);
  
  const scoreColWidth = (pageWidth - 90) / data.candidates.length;
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : `Cand ${index + 1}`;
    const shortName = name.length > 10 ? name.substring(0, 8) + '.' : name;
    pdf.text(shortName, 90 + (index * scoreColWidth), yPos);
  });
  
  yPos += 2;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  data.skillComparison.forEach((skill, skillIndex) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    if (skillIndex % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 4, pageWidth - 40, 7, 'F');
    }
    
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    const skillName = skill.skillName.length > 28 ? skill.skillName.substring(0, 25) + '...' : skill.skillName;
    pdf.text(skillName, 22, yPos);
    
    skill.scores.forEach((score, index) => {
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      if (score !== null) {
        pdf.setFont('helvetica', 'bold');
        const perf = getPerformanceLevel(score);
        pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
        pdf.text(`${score}`, 95 + (index * scoreColWidth), yPos);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(150, 150, 150);
        pdf.text('N/A', 95 + (index * scoreColWidth), yPos);
      }
    });
    
    yPos += 7;
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
  
  // ========== PAGE 1: COVER PAGE ==========
  addHeader(pdf, pageWidth);
  
  // Title Section with blue background
  yPos = 50;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 45, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ROLE FIT ANALYSIS', pageWidth / 2, yPos + 15, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', pageWidth / 2, yPos + 25, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Candidate Information Card
  yPos = 110;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(30, yPos, pageWidth - 60, 40, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE', 40, yPos + 10);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(17, 24, 39);
  pdf.text(candidateName, 40, yPos + 20);
  
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(data.candidate.user.email, 40, yPos + 28);
  
  pdf.setTextColor(0, 0, 0);
  
  // Role Information Card
  yPos = 160;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  const roleCardHeight = data.role.description ? 55 : 40;
  pdf.roundedRect(30, yPos, pageWidth - 60, roleCardHeight, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('TARGET ROLE', 40, yPos + 10);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(17, 24, 39);
  pdf.text(data.role.name, 40, yPos + 20);
  
  if (data.role.description) {
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    const descLines = pdf.splitTextToSize(data.role.description, pageWidth - 80);
    descLines.forEach((line: string, index: number) => {
      pdf.text(line, 40, yPos + 28 + (index * 4));
    });
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: OVERALL FIT SCORE ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'OVERALL FIT SCORE', yPos, pageWidth);
  yPos += 10;
  
  const fitColor = data.alignment.overallFit >= 80 ? [34, 197, 94] : 
                   data.alignment.overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = data.alignment.overallFit >= 80 ? 'Excellent Fit' : 
                   data.alignment.overallFit >= 60 ? 'Good Fit' : 'Needs Development';
  
  // Large score display card
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.setLineWidth(1);
  pdf.roundedRect(40, yPos, pageWidth - 80, 60, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(48);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${data.alignment.overallFit}%`, pageWidth / 2, yPos + 30, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fitLabel, pageWidth / 2, yPos + 45, { align: 'center' });
  
  yPos += 70;
  pdf.setTextColor(0, 0, 0);
  
  // Visual gauge (progress bar)
  pdf.setFontSize(9);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Alignment Strength', 40, yPos);
  yPos += 5;
  
  const barWidth = pageWidth - 80;
  const barHeight = 8;
  
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(40, yPos, barWidth, barHeight, 2, 2, 'F');
  
  const fillWidth = (data.alignment.overallFit / 100) * barWidth;
  pdf.setFillColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.roundedRect(40, yPos, fillWidth, barHeight, 2, 2, 'F');
  
  yPos += 15;
  pdf.setTextColor(0, 0, 0);
  
  // ========== SKILL ALIGNMENT ANALYSIS ==========
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Detailed skill-by-skill alignment with role requirements', 20, yPos);
  yPos += 8;
  
  // Table header
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Skill', 22, yPos);
  pdf.text('Your Score', 95, yPos);
  pdf.text('Required', 130, yPos);
  pdf.text('Gap', 160, yPos);
  
  yPos += 2;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  data.alignment.skillAlignments.forEach((skill, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 4, pageWidth - 40, 10, 'F');
    }
    
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    const skillName = skill.skillName.length > 30 ? skill.skillName.substring(0, 27) + '...' : skill.skillName;
    pdf.text(skillName, 22, yPos);
    
    const scorePerf = getPerformanceLevel(skill.candidateScore);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(scorePerf.color[0], scorePerf.color[1], scorePerf.color[2]);
    pdf.text(`${skill.candidateScore}`, 100, yPos);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(`${skill.requiredScore}`, 135, yPos);
    
    const gapText = skill.gap > 0 ? `-${skill.gap}` : `+${Math.abs(skill.gap)}`;
    const gapColor = skill.gap <= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
    pdf.text(gapText, 165, yPos);
    
    // Progress bar for each skill
    const miniBarWidth = 20;
    const miniBarHeight = 3;
    const barX = 145;
    
    pdf.setFillColor(229, 231, 235);
    pdf.rect(barX, yPos - 2, miniBarWidth, miniBarHeight, 'F');
    
    const skillFillWidth = (skill.candidateScore / 100) * miniBarWidth;
    pdf.setFillColor(scorePerf.color[0], scorePerf.color[1], scorePerf.color[2]);
    pdf.rect(barX, yPos - 2, skillFillWidth, miniBarHeight, 'F');
    
    yPos += 10;
  });
  
  yPos += 5;
  pdf.setTextColor(0, 0, 0);
  
  // ========== STRENGTHS ==========
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addHeader(pdf, pageWidth);
    yPos = 35;
  }
  
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Areas where the candidate exceeds or meets role requirements', 20, yPos);
  yPos += 8;
  
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(34, 197, 94);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, yPos, pageWidth - 40, 5 + (data.alignment.strengths.length * 8), 2, 2, 'FD');
  pdf.setLineWidth(0.2);
  
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  data.alignment.strengths.forEach((strength) => {
    if (yPos > pageHeight - 25) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setTextColor(34, 197, 94);
    pdf.text('✓', 25, yPos);
    
    pdf.setTextColor(22, 101, 52);
    const strengthLines = pdf.splitTextToSize(strength, pageWidth - 55);
    strengthLines.forEach((line: string, index: number) => {
      pdf.text(line, 32, yPos + (index * 4));
    });
    yPos += Math.max(strengthLines.length * 4, 6) + 2;
  });
  
  yPos += 5;
  pdf.setTextColor(0, 0, 0);
  
  // ========== DEVELOPMENT AREAS ==========
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addHeader(pdf, pageWidth);
    yPos = 35;
  }
  
  yPos = addSectionHeader(pdf, 'DEVELOPMENT AREAS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skills requiring improvement to better align with role requirements', 20, yPos);
  yPos += 8;
  
  pdf.setFillColor(254, 242, 242);
  pdf.setDrawColor(239, 68, 68);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, yPos, pageWidth - 40, 5 + (data.alignment.gaps.length * 8), 2, 2, 'FD');
  pdf.setLineWidth(0.2);
  
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  data.alignment.gaps.forEach((gap) => {
    if (yPos > pageHeight - 25) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setTextColor(239, 68, 68);
    pdf.text('⚠', 25, yPos);
    
    pdf.setTextColor(127, 29, 29);
    const gapLines = pdf.splitTextToSize(gap, pageWidth - 55);
    gapLines.forEach((line: string, index: number) => {
      pdf.text(line, 32, yPos + (index * 4));
    });
    yPos += Math.max(gapLines.length * 4, 6) + 2;
  });
  
  yPos += 5;
  pdf.setTextColor(0, 0, 0);
  
  // ========== RECOMMENDATIONS ==========
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addHeader(pdf, pageWidth);
    yPos = 35;
  }
  
  yPos = addSectionHeader(pdf, 'RECOMMENDATIONS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Strategic guidance for maximizing role fit and development', 20, yPos);
  yPos += 8;
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  const recParagraphs = data.alignment.recommendations.split('\n\n');
  recParagraphs.forEach((paragraph) => {
    const recLines = pdf.splitTextToSize(paragraph.trim(), pageWidth - 50);
    
    const paragraphHeight = recLines.length * 4 + 10;
    if (yPos + paragraphHeight > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.roundedRect(20, yPos, pageWidth - 40, paragraphHeight, 2, 2, 'FD');
    
    recLines.forEach((line: string, index: number) => {
      pdf.text(line, 25, yPos + 7 + (index * 4));
    });
    
    yPos += paragraphHeight + 5;
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
