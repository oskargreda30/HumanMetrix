import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ===== HELPER FUNCTIONS (copied from pdfExport.ts) =====

function addBackgroundPattern(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  pdf.setFillColor(249, 250, 251);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  pdf.setFillColor(243, 244, 246);
  const dotSize = 0.5;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(5 + (i * 3), 30 + (j * 3), dotSize, 'F');
    }
  }
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(pageWidth - 15 + (i * 3), 30 + (j * 3), dotSize, 'F');
    }
  }
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(5 + (i * 3), pageHeight - 30 + (j * 3), dotSize, 'F');
    }
  }
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pdf.circle(pageWidth - 15 + (i * 3), pageHeight - 30 + (j * 3), dotSize, 'F');
    }
  }
}

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

function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Excellent', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Good', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Fair', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
}

const CANDIDATE_COLORS = [
  [59, 130, 246],   // Blue
  [34, 197, 94],    // Green
  [249, 115, 22],   // Orange
];

// ===== SAMPLE DATA =====

const sarahChen = {
  user: {
    firstName: 'Sarah',
    lastName: 'C***',
    email: 's***@example.com'
  },
  results: [
    { status: 'completed', assessmentType: 'FIT' },
    { status: 'completed', assessmentType: 'AI Readiness' },
    { status: 'completed', assessmentType: 'Prompt Architecture' },
    { status: 'completed', assessmentType: 'AIQ' }
  ]
};

const marcusJohnson = {
  user: {
    firstName: 'Marcus',
    lastName: 'J***',
    email: 'm***@example.com'
  },
  results: [
    { status: 'completed', assessmentType: 'FIT' },
    { status: 'completed', assessmentType: 'AI Readiness' },
    { status: 'completed', assessmentType: 'Prompt Architecture' },
    { status: 'completed', assessmentType: 'AIQ' }
  ]
};

const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

const sarahFitScores = {
  'High Agency': 88,
  'Intellectual Curiosity': 92,
  'Resilience': 85,
  'Empathy & Ethics': 90,
  'Growth Mindset': 87,
  'Interpersonal Agility': 91
};

const sarahAIReadinessScores = {
  'AI Literacy/Prompting': 85,
  'Technical Fluency': 78,
  'Domain Fluency': 82,
  'Critical Thinking': 90,
  'Adaptive Learning': 88,
  'Responsible AI': 92,
  'Domain Expertise': 80,
  'Creative Innovation': 86,
  'Cross-functional Collab': 84
};

const marcusFitScores = {
  'High Agency': 82,
  'Intellectual Curiosity': 75,
  'Resilience': 88,
  'Empathy & Ethics': 80,
  'Growth Mindset': 78,
  'Interpersonal Agility': 85
};

const marcusAIReadinessScores = {
  'AI Literacy/Prompting': 72,
  'Technical Fluency': 88,
  'Domain Fluency': 70,
  'Critical Thinking': 82,
  'Adaptive Learning': 75,
  'Responsible AI': 78,
  'Domain Expertise': 85,
  'Creative Innovation': 73,
  'Cross-functional Collab': 80
};

// ===== PDF GENERATION FUNCTIONS =====

function generateIndividualPDF(
  candidate: typeof sarahChen,
  fitScores: Record<string, number>,
  aiReadinessScores: Record<string, number>,
  promptArchitectureScore: number,
  aiqScore: number
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  // ========== PAGE 1: COVER PAGE ==========
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
  
  const candidateName = `${candidate.user.firstName} ${candidate.user.lastName}`;
  pdf.setFontSize(12);
  pdf.text(candidateName.toUpperCase(), pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Candidate Information Card
  yPos = 110;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(30, yPos, pageWidth - 60, 40, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', pageWidth / 2, yPos + 10, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Name: ${candidateName}`, pageWidth / 2, yPos + 20, { align: 'center' });
  pdf.text(`Email: ${candidate.user.email}`, pageWidth / 2, yPos + 27, { align: 'center' });
  pdf.text(`Assessments Completed: 4`, pageWidth / 2, yPos + 34, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Key Metrics
  yPos = 165;
  const allScores = [...Object.values(fitScores), ...Object.values(aiReadinessScores), promptArchitectureScore, aiqScore];
  const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  const boxWidth = (pageWidth - 60) / 3;
  
  const metricsData = [
    { label: 'Skills Assessed', value: '19' },
    { label: 'Average Score', value: `${avgScore}/100` },
    { label: 'Top Skill', value: 'Responsible AI' },
  ];
  
  metricsData.forEach((metric, index) => {
    const xPos = 30 + (index * boxWidth);
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(xPos, yPos, boxWidth - 5, 25, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(metric.label, xPos + (boxWidth - 5) / 2, yPos + 8, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(metric.value, xPos + (boxWidth - 5) / 2, yPos + 18, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: ASSESSMENT SCORES ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'FIT ASSESSMENT - BEHAVIORAL SKILLS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text('Six core behavioral competencies for workplace success', 20, yPos);
  yPos += 10;
  
  // FIT scores table
  Object.entries(fitScores).forEach((([skillName, score]) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setFillColor(249, 250, 251);
    pdf.rect(20, yPos - 3, pageWidth - 40, 10, 'F');
    
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skillName, 25, yPos + 3);
    
    const perf = getPerformanceLevel(score);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${score}`, pageWidth - 30, yPos + 3, { align: 'right' });
    
    // Progress bar
    const barWidth = 50;
    const barX = pageWidth - 85;
    pdf.setFillColor(229, 231, 235);
    pdf.rect(barX, yPos, barWidth, 5, 'F');
    pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.rect(barX, yPos, (barWidth * score) / 100, 5, 'F');
    
    yPos += 12;
  }));
  
  pdf.setTextColor(0, 0, 0);
  yPos += 5;
  
  // AI Readiness scores
  yPos = addSectionHeader(pdf, 'AI READINESS ASSESSMENT', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text('Nine AI-specific competencies for modern workplace effectiveness', 20, yPos);
  yPos += 10;
  
  Object.entries(aiReadinessScores).forEach(([skillName, score]) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setFillColor(249, 250, 251);
    pdf.rect(20, yPos - 3, pageWidth - 40, 10, 'F');
    
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skillName, 25, yPos + 3);
    
    const perf = getPerformanceLevel(score);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${score}`, pageWidth - 30, yPos + 3, { align: 'right' });
    
    // Progress bar
    const barWidth = 50;
    const barX = pageWidth - 85;
    pdf.setFillColor(229, 231, 235);
    pdf.rect(barX, yPos, barWidth, 5, 'F');
    pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.rect(barX, yPos, (barWidth * score) / 100, 5, 'F');
    
    yPos += 12;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 3: ADDITIONAL ASSESSMENTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);
  yPos += 10;
  
  const promptPerf = getPerformanceLevel(promptArchitectureScore);
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
  pdf.setLineWidth(1);
  pdf.roundedRect(40, yPos, pageWidth - 80, 40, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('Overall Prompt Engineering Score', pageWidth / 2, yPos + 15, { align: 'center' });
  
  pdf.setFontSize(24);
  pdf.setTextColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
  pdf.text(`${promptArchitectureScore}/100`, pageWidth / 2, yPos + 30, { align: 'center' });
  
  yPos += 50;
  pdf.setTextColor(0, 0, 0);
  
  // AIQ Assessment
  yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
  yPos += 10;
  
  const aiqPerf = getPerformanceLevel(aiqScore);
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
  pdf.setLineWidth(1);
  pdf.roundedRect(40, yPos, pageWidth - 80, 40, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('AI Ethics & Responsibility Score', pageWidth / 2, yPos + 15, { align: 'center' });
  
  pdf.setFontSize(24);
  pdf.setTextColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
  pdf.text(`${aiqScore}/100`, pageWidth / 2, yPos + 30, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Add footers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  return pdf;
}

function generateComparisonPDF(
  candidates: typeof sarahChen[],
  fitAssessments: Record<string, number>[],
  aiReadinessAssessments: Record<string, number>[],
  promptScores: number[],
  aiqScores: number[]
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  // ========== PAGE 1: COVER PAGE ==========
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section
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
  candidates.forEach((candidate, index) => {
    const name = `${candidate.user.firstName} ${candidate.user.lastName}`;
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    const cardY = yPos + (index * 45);
    
    const allScores = [...Object.values(fitAssessments[index]), ...Object.values(aiReadinessAssessments[index]), promptScores[index], aiqScores[index]];
    const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
    
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
  
  // ========== PAGE 2: SKILL COMPARISON ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'FIT ASSESSMENT COMPARISON', yPos, pageWidth);
  yPos += 10;
  
  // Table header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Skill Name', 22, yPos);
  
  const scoreColWidth = (pageWidth - 100) / candidates.length;
  candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index];
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const name = `${candidate.user.firstName} ${candidate.user.lastName}`;
    const shortName = name.length > 10 ? name.substring(0, 8) + '.' : name;
    pdf.text(shortName, 100 + (index * scoreColWidth), yPos);
  });
  
  yPos += 3;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 7;
  
  // FIT skills comparison
  pdf.setFont('helvetica', 'normal');
  const fitSkills = Object.keys(fitAssessments[0]);
  fitSkills.forEach((skillName, skillIndex) => {
    if (skillIndex % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 4, pageWidth - 40, 8, 'F');
    }
    
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    pdf.text(skillName, 22, yPos);
    
    candidates.forEach((_, index) => {
      const score = fitAssessments[index][skillName];
      const perf = getPerformanceLevel(score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${score}`, 105 + (index * scoreColWidth), yPos);
    });
    
    yPos += 8;
  });
  
  yPos += 10;
  
  // AI Readiness comparison
  yPos = addSectionHeader(pdf, 'AI READINESS COMPARISON', yPos, pageWidth);
  yPos += 10;
  
  // Table header
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Skill Name', 22, yPos);
  
  candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index];
    pdf.setTextColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    const name = `${candidate.user.firstName} ${candidate.user.lastName}`;
    const shortName = name.length > 10 ? name.substring(0, 8) + '.' : name;
    pdf.text(shortName, 100 + (index * scoreColWidth), yPos);
  });
  
  yPos += 3;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 7;
  
  const aiSkills = Object.keys(aiReadinessAssessments[0]);
  aiSkills.forEach((skillName, skillIndex) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    if (skillIndex % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 4, pageWidth - 40, 8, 'F');
    }
    
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('helvetica', 'normal');
    const shortSkillName = skillName.length > 25 ? skillName.substring(0, 22) + '...' : skillName;
    pdf.text(shortSkillName, 22, yPos);
    
    candidates.forEach((_, index) => {
      const score = aiReadinessAssessments[index][skillName];
      const perf = getPerformanceLevel(score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${score}`, 105 + (index * scoreColWidth), yPos);
    });
    
    yPos += 8;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Add footers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  return pdf;
}

function generateRoleFitPDF(
  candidate: typeof sarahChen,
  roleName: string,
  overallFit: number,
  fitScores: Record<string, number>,
  aiReadinessScores: Record<string, number>
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  let yPos = 30;
  
  const candidateName = `${candidate.user.firstName} ${candidate.user.lastName}`;
  
  // ========== PAGE 1: COVER PAGE ==========
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
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
  pdf.text(candidate.user.email, 40, yPos + 28);
  
  pdf.setTextColor(0, 0, 0);
  
  // Role Information Card
  yPos = 160;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(30, yPos, pageWidth - 60, 40, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('TARGET ROLE', 40, yPos + 10);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(17, 24, 39);
  pdf.text(roleName, 40, yPos + 20);
  
  pdf.setFontSize(8);
  pdf.setTextColor(107, 114, 128);
  pdf.text('Build and maintain software applications using modern technologies', 40, yPos + 28);
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: OVERALL FIT SCORE ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'OVERALL FIT SCORE', yPos, pageWidth);
  yPos += 10;
  
  const fitColor = overallFit >= 80 ? [34, 197, 94] : 
                   overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  const fitLabel = overallFit >= 80 ? 'Excellent Fit' : 
                   overallFit >= 60 ? 'Good Fit' : 'Needs Development';
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.setLineWidth(1);
  pdf.roundedRect(40, yPos, pageWidth - 80, 60, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(48);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${overallFit}%`, pageWidth / 2, yPos + 30, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(fitLabel, pageWidth / 2, yPos + 45, { align: 'center' });
  
  yPos += 70;
  pdf.setTextColor(0, 0, 0);
  
  // ========== SKILL ALIGNMENT ==========
  yPos = addSectionHeader(pdf, 'SKILL ALIGNMENT ANALYSIS', yPos, pageWidth);
  yPos += 10;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(75, 85, 99);
  pdf.text('Key Skills for Software Engineer Role', 20, yPos);
  yPos += 10;
  
  const keySkills = [
    { name: 'Technical Fluency', score: aiReadinessScores['Technical Fluency'], required: 75 },
    { name: 'Critical Thinking', score: aiReadinessScores['Critical Thinking'], required: 80 },
    { name: 'AI Literacy/Prompting', score: aiReadinessScores['AI Literacy/Prompting'], required: 70 },
    { name: 'Intellectual Curiosity', score: fitScores['Intellectual Curiosity'], required: 85 },
    { name: 'Growth Mindset', score: fitScores['Growth Mindset'], required: 80 },
  ];
  
  keySkills.forEach((skill) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setFillColor(249, 250, 251);
    pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
    
    pdf.setFontSize(8);
    pdf.setTextColor(55, 65, 81);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skill.name, 25, yPos + 3);
    
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Required: ${skill.required}`, 25, yPos + 8);
    
    const perf = getPerformanceLevel(skill.score);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${skill.score}`, pageWidth - 30, yPos + 5, { align: 'right' });
    
    // Progress bar
    const barWidth = 60;
    const barX = pageWidth - 100;
    pdf.setFillColor(229, 231, 235);
    pdf.rect(barX, yPos + 1, barWidth, 5, 'F');
    pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.rect(barX, yPos + 1, (barWidth * skill.score) / 100, 5, 'F');
    
    yPos += 14;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== STRENGTHS ==========
  yPos += 5;
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 5;
  
  const strengths = [
    'Exceptional AI literacy and responsible AI integration capabilities',
    'Strong critical thinking and intellectual curiosity',
    'High adaptive learning ability for emerging technologies',
    'Excellent interpersonal agility and growth mindset'
  ];
  
  pdf.setFillColor(240, 253, 244);
  pdf.setDrawColor(34, 197, 94);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(20, yPos, pageWidth - 40, 5 + (strengths.length * 8), 2, 2, 'FD');
  pdf.setLineWidth(0.2);
  
  yPos += 5;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  strengths.forEach((strength) => {
    pdf.setTextColor(34, 197, 94);
    pdf.text('✓', 25, yPos);
    
    pdf.setTextColor(22, 101, 52);
    const lines = pdf.splitTextToSize(strength, pageWidth - 55);
    lines.forEach((line: string, index: number) => {
      pdf.text(line, 32, yPos + (index * 4));
    });
    yPos += Math.max(lines.length * 4, 6) + 2;
  });
  
  yPos += 5;
  pdf.setTextColor(0, 0, 0);
  
  // Add footers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  return pdf;
}

// ===== MAIN EXECUTION =====

console.log('Generating sample PDF reports...\n');

// Generate Sarah Chen Individual Report
console.log('1. Generating individual report for Sarah Chen...');
const sarahIndividualPDF = generateIndividualPDF(
  sarahChen,
  sarahFitScores,
  sarahAIReadinessScores,
  82,
  85
);

const individualPath = join(__dirname, '..', 'client', 'public', 'sample-reports', 'individual-sample.pdf');
writeFileSync(individualPath, Buffer.from(sarahIndividualPDF.output('arraybuffer')));
console.log(`   ✓ Saved to ${individualPath}`);

// Generate Sarah vs Marcus Comparison Report
console.log('\n2. Generating comparison report (Sarah vs Marcus)...');
const comparisonPDF = generateComparisonPDF(
  [sarahChen, marcusJohnson],
  [sarahFitScores, marcusFitScores],
  [sarahAIReadinessScores, marcusAIReadinessScores],
  [82, 75],
  [85, 78]
);

const comparisonPath = join(__dirname, '..', 'client', 'public', 'sample-reports', 'comparison-sample.pdf');
writeFileSync(comparisonPath, Buffer.from(comparisonPDF.output('arraybuffer')));
console.log(`   ✓ Saved to ${comparisonPath}`);

// Generate Sarah Role Fit Report
console.log('\n3. Generating role fit report for Sarah Chen (Software Engineer)...');
const roleFitPDF = generateRoleFitPDF(
  sarahChen,
  'Software Engineer',
  85,
  sarahFitScores,
  sarahAIReadinessScores
);

const roleFitPath = join(__dirname, '..', 'client', 'public', 'sample-reports', 'rolefit-sample.pdf');
writeFileSync(roleFitPath, Buffer.from(roleFitPDF.output('arraybuffer')));
console.log(`   ✓ Saved to ${roleFitPath}`);

console.log('\n✅ All sample PDFs generated successfully!');
console.log('\nGenerated files:');
console.log('  - client/public/sample-reports/individual-sample.pdf');
console.log('  - client/public/sample-reports/comparison-sample.pdf');
console.log('  - client/public/sample-reports/rolefit-sample.pdf');
