import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
  if (score >= 85) return { label: 'Exceptional', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Strong', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Competent', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
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
    developmentAreas: string[];
    recommendations: string[];
  };
}

export async function exportEnhancedCandidatePDF(
  candidate: CandidateData,
  skills: SkillData[],
  platformAverages: PlatformAverages,
  radarChartImages?: { fit?: string; aiReadiness?: string },
  roleComparison?: RoleComparisonData
) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const candidateName = candidate.user.firstName || candidate.user.lastName
    ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
    : 'Candidate';

  // ========== PAGE 1: COVER PAGE ==========
  let yPos = 30;
  
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
  
  // Executive Summary
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
  
  // Key Metrics
  yPos = 215;
  const boxWidth = (pageWidth - 60) / 3;
  
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const metricsData = [
    { label: 'Skills Assessed', value: skills.length.toString() },
    { label: 'Average Score', value: `${avgScore}/100` },
    { label: 'Top Skill', value: topSkills[0]?.name.substring(0, 15) || 'N/A' },
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
  
  // ========== PAGE 2: RADAR CHARTS ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS VISUALIZATION', yPos, pageWidth);
  yPos += 5;
  
  // FIT Assessment Radar Chart
  if (radarChartImages?.fit) {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
    yPos += 7;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, Interpersonal Agility', 20, yPos);
    yPos += 7;
    
    try {
      pdf.addImage(radarChartImages.fit, 'PNG', 20, yPos, pageWidth - 40, 70);
      yPos += 75;
    } catch (error) {
      console.error('Error adding FIT chart:', error);
      yPos += 10;
    }
  }
  
  // AI Readiness Radar Chart
  if (radarChartImages?.aiReadiness) {
    if (yPos > pageHeight - 100) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('AI Readiness Assessment', 20, yPos);
    yPos += 7;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    const aiSkills = 'Measures: AI Literacy, Technical Fluency, Domain Fluency, Critical Thinking, Adaptive Learning,';
    const aiSkills2 = 'Responsible AI Integration, Domain Expertise, Creative Innovation, Cross-functional Collaboration';
    pdf.text(aiSkills, 20, yPos);
    yPos += 4;
    pdf.text(aiSkills2, 20, yPos);
    yPos += 7;
    
    try {
      pdf.addImage(radarChartImages.aiReadiness, 'PNG', 20, yPos, pageWidth - 40, 70);
      yPos += 75;
    } catch (error) {
      console.error('Error adding AI Readiness chart:', error);
      yPos += 10;
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 3: STRENGTHS & DEVELOPMENT ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'TOP STRENGTHS', yPos, pageWidth);
  yPos += 5;
  
  // Top 5 strengths - CONSISTENT LAYOUT
  topSkills.slice(0, 5).forEach((skill, index) => {
    const perf = getPerformanceLevel(skill.score);
    
    // Same white background for both sections
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
  
  // Development Areas - CONSISTENT LAYOUT (same as strengths)
  yPos += 5;
  const bottomSkills = [...skills].sort((a, b) => a.score - b.score).slice(0, 5);
  
  yPos = addSectionHeader(pdf, 'DEVELOPMENT OPPORTUNITIES', yPos, pageWidth);
  yPos += 5;
  
  bottomSkills.forEach((skill, index) => {
    const perf = getPerformanceLevel(skill.score);
    
    // Same white background as strengths
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
  
  // ========== PAGE 4: PLATFORM COMPARISON ==========
  pdf.addPage();
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'PLATFORM BENCHMARKING', yPos, pageWidth);
  yPos += 10;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  pdf.text(`Based on ${platformAverages.totalCandidates} candidates assessed on the HumanMetrix platform`, 20, yPos);
  yPos += 10;
  
  // Comparison metrics
  const candidateAvg = avgScore;
  const platformAvg = platformAverages.avgScoreAcrossCandidates;
  const difference = candidateAvg - platformAvg;
  
  // Overall comparison card
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Overall Performance Comparison', 25, yPos + 10);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Candidate Average: ${candidateAvg}/100`, 25, yPos + 20);
  pdf.text(`Platform Average: ${platformAvg}/100`, 25, yPos + 27);
  
  const diffColor = difference >= 0 ? [34, 197, 94] : [239, 68, 68];
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(diffColor[0], diffColor[1], diffColor[2]);
  const diffText = difference >= 0 ? `+${difference} points above average` : `${difference} points below average`;
  pdf.text(diffText, pageWidth - 25, yPos + 23, { align: 'right' });
  
  yPos += 45;
  pdf.setTextColor(0, 0, 0);
  
  // Per-skill comparison
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skill-by-Skill Comparison', 20, yPos);
  yPos += 7;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Skill', 25, yPos);
  pdf.text('Your Score', 100, yPos);
  pdf.text('Platform Avg', 135, yPos);
  pdf.text('Difference', pageWidth - 25, yPos, { align: 'right' });
  yPos += 2;
  
  pdf.setDrawColor(229, 231, 235);
  pdf.line(20, yPos, pageWidth - 20, yPos);
  yPos += 5;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(0, 0, 0);
  
  skills.forEach((skill, index) => {
    if (yPos > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const platformSkillAvg = platformAverages.skillAverages[skill.name] || platformAvg;
    const skillDiff = skill.score - platformSkillAvg;
    
    // Alternating background
    if (index % 2 === 0) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 3, pageWidth - 40, 8, 'F');
    }
    
    pdf.setTextColor(17, 24, 39);
    const skillName = skill.name.length > 30 ? skill.name.substring(0, 27) + '...' : skill.name;
    pdf.text(skillName, 25, yPos + 2);
    
    pdf.text(`${skill.score}`, 100, yPos + 2);
    pdf.text(`${Math.round(platformSkillAvg)}`, 135, yPos + 2);
    
    const skillDiffColor = skillDiff >= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setTextColor(skillDiffColor[0], skillDiffColor[1], skillDiffColor[2]);
    const skillDiffText = skillDiff >= 0 ? `+${Math.round(skillDiff)}` : `${Math.round(skillDiff)}`;
    pdf.text(skillDiffText, pageWidth - 25, yPos + 2, { align: 'right' });
    
    yPos += 8;
  });
  
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
    yPos += 5;
    
    roleComparison.alignment.strengths?.slice(0, 5).forEach((strength, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 10, 2, 2, 'FD');
      
      pdf.setFontSize(9);
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
    yPos += 5;
    
    roleComparison.alignment.developmentAreas?.slice(0, 5).forEach((area, index) => {
      if (yPos > pageHeight - 40) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 10, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(249, 115, 22);
      pdf.text('!', 30, yPos + 6);
      
      pdf.setTextColor(17, 24, 39);
      const lines = pdf.splitTextToSize(area, pageWidth - 70);
      pdf.text(lines[0], 38, yPos + 6);
      
      yPos += 12;
    });
    
    // Recommendations
    if (roleComparison.alignment.recommendations && roleComparison.alignment.recommendations.length > 0) {
      yPos += 5;
      
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      yPos = addSectionHeader(pdf, 'HIRING RECOMMENDATIONS', yPos, pageWidth);
      yPos += 5;
      
      roleComparison.alignment.recommendations.forEach((rec, index) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          addHeader(pdf, pageWidth);
          yPos = 35;
        }
        
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(25, yPos, pageWidth - 50, 12, 2, 2, 'FD');
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`${index + 1}.`, 30, yPos + 7);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(17, 24, 39);
        const lines = pdf.splitTextToSize(rec, pageWidth - 75);
        lines.forEach((line: string, lineIndex: number) => {
          pdf.text(line, 38, yPos + 7 + (lineIndex * 4));
        });
        
        yPos += 14;
      });
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
  const roleLabel = roleComparison ? `-${roleComparison.role.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}` : '';
  pdf.save(`humanmetrix-report-${safeCandidateName}${roleLabel}-${timestamp}.pdf`);
}

// Capture radar chart from DOM
export async function captureRadarChart(elementId: string): Promise<string | null> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element ${elementId} not found`);
    return null;
  }
  
  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      scale: 2,
      logging: false,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error capturing chart:', error);
    return null;
  }
}
