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

// Helper to add subtle background pattern
function addBackgroundPattern(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  // Light gradient background
  pdf.setFillColor(250, 251, 252);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Add subtle corner accents
  pdf.setFillColor(245, 247, 250);
  pdf.circle(8, 28, 1, 'F');
  pdf.circle(pageWidth - 8, 28, 1, 'F');
}

// Helper to add header
function addHeader(pdf: jsPDF, pageWidth: number) {
  pdf.setFillColor(15, 23, 42);
  pdf.rect(0, 0, pageWidth, 20, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 12, 10);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('AI Assessment Report', 12, 15);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to add footer
function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  pdf.setDrawColor(220, 220, 220);
  pdf.line(12, pageHeight - 12, pageWidth - 12, pageHeight - 12);
  
  pdf.setFontSize(7);
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Page ${pageNum} of ${totalPages}`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  );
  pdf.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth - 12,
    pageHeight - 6,
    { align: 'right' }
  );
  pdf.text('© HumanMetrix', 12, pageHeight - 6);
  
  pdf.setTextColor(0, 0, 0);
}

// Helper to create compact section header
function addSectionHeader(pdf: jsPDF, title: string, yPosition: number, pageWidth: number): number {
  pdf.setFillColor(241, 245, 249);
  pdf.rect(12, yPosition - 2, pageWidth - 24, 7, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(15, 23, 42);
  pdf.text(title, 15, yPosition + 3);
  pdf.setTextColor(0, 0, 0);
  
  return yPosition + 9;
}

// Helper to determine performance level
function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Exceptional', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Strong', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Competent', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
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

  // Calculate overall metrics
  const avgScore = skills.length > 0 
    ? Math.round(skills.reduce((sum, s) => sum + s.score, 0) / skills.length)
    : 0;
  const performance = getPerformanceLevel(avgScore);
  const completedAssessments = candidate.results?.filter((r: any) => r.status === 'completed').length || 0;

  // ========== PAGE 1: COVER & KEY METRICS ==========
  let yPos = 25;
  
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  // Title Section (compact)
  yPos = 30;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 28, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ASSESSMENT REPORT', pageWidth / 2, yPos + 10, { align: 'center' });
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(candidateName.toUpperCase(), pageWidth / 2, yPos + 20, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Candidate Profile Card (compact)
  yPos = 65;
  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(25, yPos, pageWidth - 50, 22, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('CANDIDATE PROFILE', pageWidth / 2, yPos + 6, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Email: ${candidate.user.email}`, pageWidth / 2, yPos + 12, { align: 'center' });
  pdf.text(`Assessments: ${completedAssessments} | Report Date: ${new Date().toLocaleDateString()}`, pageWidth / 2, yPos + 17, { align: 'center' });
  
  // Overall Performance Score (prominent)
  yPos = 92;
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(25, yPos, pageWidth - 50, 32, 2, 2, 'FD');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('OVERALL PERFORMANCE', pageWidth / 2, yPos + 8, { align: 'center' });
  
  pdf.setFontSize(22);
  pdf.setTextColor(performance.color[0], performance.color[1], performance.color[2]);
  pdf.text(`${avgScore}/100`, pageWidth / 2, yPos + 20, { align: 'center' });
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  pdf.text(performance.label, pageWidth / 2, yPos + 27, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Key Metrics Grid (compact)
  yPos = 130;
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const metricsData = [
    { label: 'Skills Assessed', value: skills.length.toString() },
    { label: 'Top Skill', value: topSkills[0]?.name.substring(0, 18) || 'N/A' },
    { label: 'Top Score', value: topSkills[0]?.score?.toString() || '0' },
  ];
  
  const boxWidth = (pageWidth - 54) / 3;
  metricsData.forEach((metric, index) => {
    const xPos = 27 + (index * (boxWidth + 3));
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(xPos, yPos, boxWidth, 18, 2, 2, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(metric.label, xPos + (boxWidth / 2), yPos + 6, { align: 'center' });
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(metric.value, xPos + (boxWidth / 2), yPos + 14, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // Assessment Summary Section
  yPos = 155;
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  
  const fitResult = candidate.results?.find((r: any) => r.assessmentType === 'fit' && r.status === 'completed');
  const aiReadinessResult = candidate.results?.find((r: any) => r.assessmentType === 'ai_readiness' && r.status === 'completed');
  const promptArchResult = candidate.results?.find((r: any) => r.assessmentType === 'prompt_architecture' && r.status === 'completed');
  const aiqResult = candidate.results?.find((r: any) => r.assessmentType === 'aiq' && r.status === 'completed');
  
  const addAssessmentRow = (name: string, color: [number, number, number], score: number | null, currentY: number) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(color[0], color[1], color[2]);
    pdf.text(name, 17, currentY);
    
    if (score !== null) {
      const perf = getPerformanceLevel(score);
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${score}/100`, pageWidth - 17, currentY, { align: 'right' });
      
      // Mini progress bar
      const barWidth = 50;
      const barX = pageWidth - 75;
      pdf.setDrawColor(226, 232, 240);
      pdf.setFillColor(241, 245, 249);
      pdf.rect(barX, currentY - 2.5, barWidth, 3, 'F');
      pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.rect(barX, currentY - 2.5, (barWidth * score) / 100, 3, 'F');
    } else {
      pdf.setTextColor(148, 163, 184);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Not Completed', pageWidth - 17, currentY, { align: 'right' });
    }
    
    return currentY + 7;
  };
  
  if (fitResult) {
    const fitAvg = Math.round(Object.values(fitResult.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(fitResult.scores).length);
    yPos = addAssessmentRow('FIT Assessment (Behavioral)', [59, 130, 246], fitAvg, yPos);
  }
  
  if (aiReadinessResult) {
    const aiAvg = Math.round(Object.values(aiReadinessResult.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(aiReadinessResult.scores).length);
    yPos = addAssessmentRow('AI Readiness', [147, 51, 234], aiAvg, yPos);
  }
  
  if (promptArchitectureData && promptArchitectureData.length > 0) {
    const promptAvg = Math.round(
      promptArchitectureData.reduce((sum, p) => sum + (p.totalScore || 0), 0) / promptArchitectureData.length
    );
    yPos = addAssessmentRow('Prompt Architecture', [245, 158, 11], promptAvg, yPos);
  }
  
  if (aiqResult) {
    yPos = addAssessmentRow('Algorithmic Integrity (AIQ)', [59, 130, 246], aiqResult.totalScore, yPos);
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // Key Strengths & Development Areas
  yPos += 3;
  yPos = addSectionHeader(pdf, 'KEY INSIGHTS', yPos, pageWidth);
  
  const topStrengths = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const developmentAreas = [...skills].filter(s => s.score > 0).sort((a, b) => a.score - b.score).slice(0, 2);
  
  // Strengths
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('Top Strengths:', 17, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  topStrengths.forEach((skill, index) => {
    const text = `• ${skill.name} (${skill.score}/100)`;
    pdf.text(text, 20, yPos);
    yPos += 4;
  });
  
  yPos += 2;
  
  // Development Areas
  if (developmentAreas.length > 0) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(249, 115, 22);
    pdf.text('Development Focus:', 17, yPos);
    yPos += 5;
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(51, 65, 85);
    developmentAreas.forEach((skill) => {
      const text = `• ${skill.name} (${skill.score}/100)`;
      pdf.text(text, 20, yPos);
      yPos += 4;
    });
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: DETAILED ASSESSMENT RESULTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 28;
  yPos = addSectionHeader(pdf, 'DETAILED ASSESSMENT RESULTS', yPos, pageWidth);
  yPos += 2;
  
  // FIT Assessment Radar Chart (compact)
  const fitSkills = skills.filter(s => s.assessment === 'FIT Assessment');
  if (radarChartImages?.fit && fitSkills.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment - Behavioral Skills', 15, yPos);
    yPos += 5;
    
    try {
      const imgProps = pdf.getImageProperties(radarChartImages.fit);
      const maxWidth = pageWidth - 30;
      const maxHeight = 42;
      
      let chartWidth = maxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(radarChartImages.fit, 'PNG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 3;
      
      // Compact skill scores (2 columns)
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const colWidth = (pageWidth - 30) / 2;
      fitSkills.forEach((skill, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const xPos = 15 + (col * colWidth);
        const yPosRow = yPos + (row * 4);
        
        pdf.setTextColor(71, 85, 105);
        pdf.text(`${skill.name}:`, xPos, yPosRow);
        
        const perf = getPerformanceLevel(skill.score);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
        pdf.text(`${skill.score}`, xPos + colWidth - 10, yPosRow);
        pdf.setFont('helvetica', 'normal');
      });
      
      yPos += (Math.ceil(fitSkills.length / 2) * 4) + 5;
    } catch (error) {
      console.error('Error adding FIT chart:', error);
      yPos += 5;
    }
  }
  
  // AI Readiness Radar Chart (compact)
  const aiReadinessSkills = skills.filter(s => s.assessment === 'AI Readiness');
  if (radarChartImages?.aiReadiness && aiReadinessSkills.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234);
    pdf.text('AI Readiness Assessment', 15, yPos);
    yPos += 5;
    
    try {
      const imgProps = pdf.getImageProperties(radarChartImages.aiReadiness);
      const maxWidth = pageWidth - 30;
      const maxHeight = 42;
      
      let chartWidth = maxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(radarChartImages.aiReadiness, 'PNG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 3;
      
      // Compact skill scores (2 columns)
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      const colWidth = (pageWidth - 30) / 2;
      aiReadinessSkills.forEach((skill, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const xPos = 15 + (col * colWidth);
        const yPosRow = yPos + (row * 4);
        
        pdf.setTextColor(71, 85, 105);
        pdf.text(`${skill.name}:`, xPos, yPosRow);
        
        const perf = getPerformanceLevel(skill.score);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
        pdf.text(`${skill.score}`, xPos + colWidth - 10, yPosRow);
        pdf.setFont('helvetica', 'normal');
      });
      
      yPos += (Math.ceil(aiReadinessSkills.length / 2) * 4) + 5;
    } catch (error) {
      console.error('Error adding AI Readiness chart:', error);
      yPos += 5;
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // Prompt Architecture Assessment (SIMPLIFIED - just level scores)
  if (promptArchitectureData && promptArchitectureData.length > 0) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('Prompt Architecture Assessment', 15, yPos);
    yPos += 5;
    
    // Legend
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Measures: Clarity, Structure, Context Relevance, Creativity, Iterative Improvement (20 points each)', 15, yPos);
    yPos += 5;
    
    // Level scores in compact grid
    const completedLevels = promptArchitectureData.filter(p => p.totalScore !== undefined);
    if (completedLevels.length > 0) {
      const avgScore = Math.round(
        completedLevels.reduce((sum, p) => sum + (p.totalScore || 0), 0) / completedLevels.length
      );
      const performance = getPerformanceLevel(avgScore);
      
      // Overall score
      pdf.setFillColor(254, 243, 199);
      pdf.setDrawColor(245, 158, 11);
      pdf.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'FD');
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Overall Score', 20, yPos + 7);
      
      pdf.setFontSize(10);
      pdf.setTextColor(performance.color[0], performance.color[1], performance.color[2]);
      pdf.text(`${avgScore}/100`, pageWidth - 20, yPos + 7, { align: 'right' });
      
      yPos += 15;
      
      // Level scores grid (7 levels in a row)
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(71, 85, 105);
      pdf.text('Level Scores:', 15, yPos);
      yPos += 4;
      
      const levelBoxWidth = (pageWidth - 34) / 7;
      promptArchitectureData.forEach((prompt, index) => {
        const xPos = 17 + (index * levelBoxWidth);
        
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(xPos, yPos, levelBoxWidth - 2, 10, 1, 1, 'FD');
        
        pdf.setFontSize(6);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 116, 139);
        pdf.text(`L${prompt.level}`, xPos + (levelBoxWidth - 2) / 2, yPos + 4, { align: 'center' });
        
        if (prompt.totalScore !== undefined) {
          const perf = getPerformanceLevel(prompt.totalScore);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
          pdf.text(`${prompt.totalScore}`, xPos + (levelBoxWidth - 2) / 2, yPos + 8, { align: 'center' });
        } else {
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(148, 163, 184);
          pdf.text('-', xPos + (levelBoxWidth - 2) / 2, yPos + 8, { align: 'center' });
        }
      });
      
      yPos += 14;
    }
  }
  
  // AIQ Score (simple)
  if (aiqResult) {
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Algorithmic Integrity Quotient (AIQ)', 15, yPos);
    yPos += 5;
    
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text('Measures: AI ethics, bias detection, fairness, transparency, responsible deployment', 15, yPos);
    yPos += 5;
    
    const aiqPerf = getPerformanceLevel(aiqResult.totalScore);
    
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(59, 130, 246);
    pdf.roundedRect(15, yPos, pageWidth - 30, 12, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('AIQ Score', 20, yPos + 7);
    
    pdf.setFontSize(10);
    pdf.setTextColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
    pdf.text(`${aiqResult.totalScore}/100`, pageWidth - 20, yPos + 7, { align: 'right' });
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`(${aiqPerf.label})`, pageWidth - 20, yPos + 7, { align: 'right', baseline: 'top', maxWidth: 40 });
    
    yPos += 15;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // Platform Benchmarking (if space allows on page 2, otherwise skip to page 3)
  if (platformAverages && platformAverages.totalCandidates > 1 && yPos < pageHeight - 35) {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 116, 139);
    pdf.text(`vs Platform Average (${platformAverages.totalCandidates} candidates): ${Math.round(platformAverages.avgScoreAcrossCandidates)}/100`, 15, yPos);
    yPos += 4;
  }
  
  // ========== PAGE 3: SUMMARY & RECOMMENDATIONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 28;
  
  // Role Fit Analysis (condensed - if provided)
  if (roleComparison) {
    yPos = addSectionHeader(pdf, `ROLE FIT: ${roleComparison.role.name.toUpperCase()}`, yPos, pageWidth);
    yPos += 2;
    
    pdf.setFillColor(248, 250, 252);
    pdf.setDrawColor(226, 232, 240);
    pdf.roundedRect(15, yPos, pageWidth - 30, 18, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(51, 65, 85);
    pdf.text('Overall Role Alignment', 20, yPos + 7);
    
    const fitPerf = getPerformanceLevel(roleComparison.alignment.overallFit);
    pdf.setFontSize(14);
    pdf.setTextColor(fitPerf.color[0], fitPerf.color[1], fitPerf.color[2]);
    pdf.text(`${roleComparison.alignment.overallFit}%`, pageWidth - 20, yPos + 11, { align: 'right' });
    
    yPos += 22;
    
    // Top 3 strengths and gaps (ultra-compact)
    if (roleComparison.alignment.strengths && roleComparison.alignment.strengths.length > 0) {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(34, 197, 94);
      pdf.text('Key Strengths:', 17, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      roleComparison.alignment.strengths.slice(0, 2).forEach(strength => {
        const lines = pdf.splitTextToSize(`• ${strength}`, pageWidth - 40);
        pdf.text(lines[0], 20, yPos);
        yPos += 3.5;
      });
      yPos += 2;
    }
    
    if (roleComparison.alignment.gaps && roleComparison.alignment.gaps.length > 0) {
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(249, 115, 22);
      pdf.text('Development Needs:', 17, yPos);
      yPos += 4;
      
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(51, 65, 85);
      roleComparison.alignment.gaps.slice(0, 2).forEach(gap => {
        const lines = pdf.splitTextToSize(`• ${gap}`, pageWidth - 40);
        pdf.text(lines[0], 20, yPos);
        yPos += 3.5;
      });
      yPos += 2;
    }
    
    yPos += 2;
  }
  
  yPos = addSectionHeader(pdf, 'COMPREHENSIVE SUMMARY', yPos, pageWidth);
  yPos += 3;
  
  // Overall Performance Interpretation
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, yPos, pageWidth - 30, 28, 2, 2, 'FD');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(51, 65, 85);
  pdf.text('Overall Assessment', 20, yPos + 7);
  
  pdf.setFontSize(16);
  pdf.setTextColor(performance.color[0], performance.color[1], performance.color[2]);
  pdf.text(`${avgScore}/100`, pageWidth - 20, yPos + 14, { align: 'right' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(`Performance Level: ${performance.label}`, 20, yPos + 15);
  pdf.text(`Skills Evaluated: ${skills.length}`, 20, yPos + 20);
  
  yPos += 32;
  
  // Assessment Breakdown
  yPos = addSectionHeader(pdf, 'PERFORMANCE BY ASSESSMENT', yPos, pageWidth);
  yPos += 2;
  
  const addSummaryRow = (name: string, score: number | null, interpretation: string, currentY: number) => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text(name, 17, currentY);
    
    if (score !== null) {
      const perf = getPerformanceLevel(score);
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${score}/100`, pageWidth - 17, currentY, { align: 'right' });
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105);
      const lines = pdf.splitTextToSize(interpretation, pageWidth - 38);
      lines.forEach((line: string, idx: number) => {
        pdf.text(line, 20, currentY + 5 + (idx * 3.5));
      });
      
      return currentY + 5 + (lines.length * 3.5) + 3;
    }
    
    return currentY + 5;
  };
  
  if (fitResult) {
    const fitAvg = Math.round(Object.values(fitResult.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(fitResult.scores).length);
    const fitText = fitAvg >= 70 
      ? 'Strong behavioral foundation with excellent adaptability and interpersonal skills.'
      : 'Foundational behavioral skills present with room for development.';
    yPos = addSummaryRow('FIT Assessment', fitAvg, fitText, yPos);
  }
  
  if (aiReadinessResult) {
    const aiAvg = Math.round(Object.values(aiReadinessResult.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(aiReadinessResult.scores).length);
    const aiText = aiAvg >= 70 
      ? 'Well-positioned to leverage AI tools effectively for productivity gains.'
      : 'Foundational AI awareness with opportunities for skill enhancement.';
    yPos = addSummaryRow('AI Readiness', aiAvg, aiText, yPos);
  }
  
  if (promptArchitectureData && promptArchitectureData.length > 0) {
    const promptAvg = Math.round(
      promptArchitectureData.reduce((sum, p) => sum + (p.totalScore || 0), 0) / promptArchitectureData.length
    );
    const promptText = promptAvg >= 70 
      ? 'Strong prompt engineering capabilities for maximizing AI output quality.'
      : 'Basic prompting skills with potential for advancement.';
    yPos = addSummaryRow('Prompt Architecture', promptAvg, promptText, yPos);
  }
  
  if (aiqResult) {
    const aiqText = aiqResult.totalScore >= 75 
      ? 'Strong ethical understanding of AI systems and responsible deployment.'
      : aiqResult.totalScore >= 50
      ? 'Foundational AI ethics knowledge; additional training recommended.'
      : 'Requires comprehensive AI ethics training before system deployment.';
    yPos = addSummaryRow('AIQ', aiqResult.totalScore, aiqText, yPos);
  }
  
  yPos += 3;
  
  // Recommendations
  yPos = addSectionHeader(pdf, 'RECOMMENDATIONS', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('✓ Strengths to Leverage:', 17, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  
  const strengthRecs = topStrengths.map(s => 
    `${s.name} (${s.score}/100) - Continue building on this strong foundation.`
  );
  
  strengthRecs.forEach(rec => {
    const lines = pdf.splitTextToSize(`• ${rec}`, pageWidth - 40);
    lines.forEach((line: string) => {
      pdf.text(line, 20, yPos);
      yPos += 3.5;
    });
  });
  
  yPos += 3;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(249, 115, 22);
  pdf.text('→ Development Focus:', 17, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  
  if (developmentAreas.length > 0) {
    const devRecs = developmentAreas.map(s => 
      `${s.name} (${s.score}/100) - Targeted training recommended to enhance capabilities.`
    );
    
    devRecs.forEach(rec => {
      const lines = pdf.splitTextToSize(`• ${rec}`, pageWidth - 40);
      lines.forEach((line: string) => {
        pdf.text(line, 20, yPos);
        yPos += 3.5;
      });
    });
  } else {
    pdf.text('• Continue developing all competencies to maintain strong performance.', 20, yPos);
    yPos += 3.5;
  }
  
  yPos += 3;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('◆ Next Steps:', 17, yPos);
  yPos += 5;
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(51, 65, 85);
  
  const nextSteps = avgScore >= 70 
    ? [
        'Consider advanced AI training programs to further enhance productivity.',
        'Share best practices with team members to multiply organizational impact.',
        'Explore mentorship opportunities in AI adoption and implementation.',
      ]
    : [
        'Enroll in foundational AI literacy and prompt engineering courses.',
        'Practice prompt design through hands-on exercises and real-world scenarios.',
        'Seek guidance from AI-proficient colleagues to accelerate learning.',
      ];
  
  nextSteps.forEach(step => {
    const lines = pdf.splitTextToSize(`• ${step}`, pageWidth - 40);
    lines.forEach((line: string) => {
      pdf.text(line, 20, yPos);
      yPos += 3.5;
    });
  });
  
  yPos += 5;
  
  // Footer note
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(226, 232, 240);
  pdf.roundedRect(15, yPos, pageWidth - 30, 16, 2, 2, 'FD');
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 116, 139);
  const footerText = 'This assessment provides insights into AI-era workplace competencies. Results should be considered alongside practical experience, domain expertise, and role requirements for comprehensive evaluation.';
  const footerLines = pdf.splitTextToSize(footerText, pageWidth - 40);
  footerLines.forEach((line: string, idx: number) => {
    pdf.text(line, 20, yPos + 5 + (idx * 3.5));
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
  pdf.save(`humanmetrix-report-${safeCandidateName}-${timestamp}.pdf`);
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
