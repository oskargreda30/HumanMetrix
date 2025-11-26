import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';

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

interface AssessmentResult {
  assessmentType: string;
  scores: Record<string, number>;
  totalScore?: number;
  completedAt: string;
  evaluations?: any[];
}

interface SkillData {
  name: string;
  score: number;
  assessment: string;
}

// Helper to add header to each page
function addHeader(pdf: jsPDF, pageWidth: number) {
  // Clean white header background
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  // HumanMetrix Logo - 1.5x larger (45x45) for strong presence
  try {
    pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', 12, 3, 45, 45);
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  // Company name - positioned close to logo, vertically centered
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 62, 22);
  
  // Tagline - positioned below company name
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 62, 30);
  
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
  if (score >= 85) return { label: 'Exceptional', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Strong', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Competent', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
}

export async function exportProfessionalCandidatePDF(
  candidate: CandidateData,
  skills: SkillData[],
  roleRecommendations?: string
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const candidateName = candidate.user.firstName || candidate.user.lastName
    ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
    : 'Candidate';

  // ========== PAGE 1: COVER PAGE ==========
  let yPos = 30;
  
  // Header
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
  pdf.text(`Assessments Completed: ${candidate.results?.filter((r: any) => r.status === 'completed').length || 0}`, pageWidth / 2, yPos + 34, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Executive Summary Section
  yPos = 165;
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('EXECUTIVE SUMMARY', pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  const avgScore = skills.length > 0 
    ? Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length)
    : 0;
  const performance = getPerformanceLevel(avgScore);
  
  const summaryLines = [
    `This comprehensive assessment report provides a detailed evaluation of ${candidateName}'s`,
    `capabilities across ${skills.length} key competencies. The assessment encompasses behavioral skills,`,
    `AI readiness, prompt engineering, and ethical decision-making.`,
    '',
    `Overall Performance Level: ${performance.label} (${avgScore}/100)`,
  ];
  
  summaryLines.forEach((line, index) => {
    pdf.text(line, pageWidth / 2, yPos + (index * 5), { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Key Metrics Box
  yPos = 215;
  const boxWidth = (pageWidth - 60) / 3;
  
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const metricsData = [
    { label: 'Skills Assessed', value: skills.length.toString() },
    { label: 'Average Score', value: `${avgScore}/100` },
    { label: 'Top Skill', value: topSkills[0]?.name || 'N/A' },
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
    
    // Fit the metric value to the available width
    pdf.setFont('helvetica', 'bold');
    const maxValueWidth = (boxWidth - 5) - 4; // Leave 2mm padding on each side
    const fitted = fitMetricValue(pdf, metric.value, maxValueWidth, 14, 10);
    
    pdf.setFontSize(fitted.fontSize);
    pdf.setTextColor(17, 24, 39);
    pdf.text(fitted.text, xPos + (boxWidth - 5) / 2, yPos + 18, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: SKILLS OVERVIEW ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS OVERVIEW', yPos, pageWidth);
  yPos += 5;
  
  // Placeholder for radar chart (will be added via html2canvas in actual implementation)
  pdf.setDrawColor(229, 231, 235);
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(30, yPos, pageWidth - 60, 80, 3, 3, 'FD');
  
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text('[Radar Chart: Multi-dimensional skill assessment visualization]', pageWidth / 2, yPos + 40, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  
  yPos += 90;
  
  // Top Strengths
  yPos = addSectionHeader(pdf, 'TOP STRENGTHS', yPos, pageWidth);
  yPos += 5;
  
  topSkills.slice(0, 5).forEach((skill, index) => {
    const perf = getPerformanceLevel(skill.score);
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`${index + 1}. ${skill.name}`, 25, yPos + 6);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${skill.score}/100`, pageWidth - 25, yPos + 6, { align: 'right' });
    
    // Progress bar
    const barWidth = 40;
    const barX = pageWidth - 70;
    pdf.setDrawColor(229, 231, 235);
    pdf.setFillColor(243, 244, 246);
    pdf.rect(barX, yPos + 8, barWidth, 2, 'F');
    pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.rect(barX, yPos + 8, (barWidth * skill.score) / 100, 2, 'F');
    
    yPos += 14;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Development Areas
  yPos += 5;
  const bottomSkills = [...skills].sort((a, b) => a.score - b.score).slice(0, 3);
  
  yPos = addSectionHeader(pdf, 'DEVELOPMENT OPPORTUNITIES', yPos, pageWidth);
  yPos += 5;
  
  bottomSkills.forEach((skill, index) => {
    const perf = getPerformanceLevel(skill.score);
    
    pdf.setFillColor(254, 252, 232);
    pdf.setDrawColor(234, 179, 8);
    pdf.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(`${skill.name}`, 25, yPos + 6);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${skill.score}/100`, pageWidth - 25, yPos + 6, { align: 'right' });
    
    yPos += 14;
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 3: DETAILED BREAKDOWN ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'DETAILED SKILL BREAKDOWN', yPos, pageWidth);
  yPos += 5;
  
  // Group skills by assessment
  const skillsByAssessment: Record<string, SkillData[]> = {};
  skills.forEach(skill => {
    if (!skillsByAssessment[skill.assessment]) {
      skillsByAssessment[skill.assessment] = [];
    }
    skillsByAssessment[skill.assessment].push(skill);
  });
  
  Object.entries(skillsByAssessment).forEach(([assessment, assessmentSkills]) => {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    // Assessment header
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(assessment, 20, yPos);
    yPos += 7;
    
    // Skills table
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Skill', 25, yPos);
    pdf.text('Score', pageWidth - 50, yPos);
    pdf.text('Performance', pageWidth - 25, yPos, { align: 'right' });
    yPos += 2;
    
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 4;
    
    pdf.setFont('helvetica', 'normal');
    assessmentSkills.forEach((skill, index) => {
      const perf = getPerformanceLevel(skill.score);
      
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Alternating background
      if (index % 2 === 0) {
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, 8, 'F');
      }
      
      pdf.setTextColor(17, 24, 39);
      const skillName = skill.name.length > 50 ? skill.name.substring(0, 47) + '...' : skill.name;
      pdf.text(skillName, 25, yPos + 2);
      
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${skill.score}`, pageWidth - 50, yPos + 2);
      
      pdf.setFontSize(7);
      pdf.text(perf.label, pageWidth - 25, yPos + 2, { align: 'right' });
      pdf.setFontSize(8);
      
      yPos += 8;
    });
    
    yPos += 8;
    pdf.setTextColor(0, 0, 0);
  });
  
  // ========== PAGE 4: RECOMMENDATIONS (if provided) ==========
  if (roleRecommendations) {
    pdf.addPage();
    addHeader(pdf, pageWidth);
    
    yPos = 35;
    yPos = addSectionHeader(pdf, 'ROLE RECOMMENDATIONS', yPos, pageWidth);
    yPos += 10;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    const lines = pdf.splitTextToSize(roleRecommendations, pageWidth - 50);
    lines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      pdf.text(line, 25, yPos);
      yPos += 5;
    });
    
    pdf.setTextColor(0, 0, 0);
  }
  
  // Add footers to all pages with correct page numbers
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  // Save
  const timestamp = new Date().toISOString().split('T')[0];
  const safeCandidateName = candidateName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  pdf.save(`humanmetrix-assessment-${safeCandidateName}-${timestamp}.pdf`);
}

// Capture radar chart from DOM and add to PDF
export async function captureChartImage(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) return null;
  
  try {
    await document.fonts.ready;
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      useCORS: true,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
}
