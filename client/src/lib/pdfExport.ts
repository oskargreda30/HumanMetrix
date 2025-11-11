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
  // Gradient header background (dark to lighter blue)
  pdf.setFillColor(30, 58, 138); // Dark blue
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  // Add subtle gradient effect with lighter overlay
  pdf.setFillColor(37, 99, 235, 0.3); // Semi-transparent lighter blue
  pdf.rect(0, 0, pageWidth * 0.6, 25, 'F');
  
  // HM Logo (monogram style)
  pdf.setFillColor(96, 165, 250); // Cyan/blue
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.setTextColor(96, 165, 250);
  pdf.text('HM', 12, 16);
  
  // Separator line
  pdf.setDrawColor(96, 165, 250);
  pdf.setLineWidth(0.5);
  pdf.line(28, 9, 28, 21);
  
  // Company name and tagline
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 32, 13);
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(191, 219, 254); // Light blue
  pdf.text('AI-Powered Assessment Platform', 32, 19);
  
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
    const perf = getPerformanceLevel(avgScore);
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
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
  const colWidth = 24;
  data.candidates.forEach((candidate, index) => {
    pdf.setTextColor(17, 24, 39);
    const shortName = getCandidateName(candidate).substring(0, 10);
    pdf.text(shortName, 80 + (index * colWidth), yPos);
  });
  pdf.setTextColor(0, 0, 0);
  yPos += 5;
  
  assessmentNames.forEach((aName, aIndex) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text(aName, 25, yPos);
    
    data.candidates.forEach((_, candIndex) => {
      const isCompleted = (assessmentData[aIndex]?.[candIndex] ?? null) !== null;
      const checkboxX = 83 + (candIndex * colWidth);
      const checkboxY = yPos - 2;
      const checkboxSize = 3;
      
      // Draw checkbox
      pdf.setDrawColor(17, 24, 39);
      pdf.setLineWidth(0.3);
      pdf.rect(checkboxX, checkboxY, checkboxSize, checkboxSize, 'D');
      
      // Fill if completed
      if (isCompleted) {
        pdf.setFillColor(34, 197, 94);
        pdf.rect(checkboxX + 0.5, checkboxY + 0.5, checkboxSize - 1, checkboxSize - 1, 'F');
      }
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
    
    // FIT Score Table (compact - keep on same page)
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('FIT Skills Comparison', 20, yPos);
    yPos += 4;
    
    pdf.setFontSize(6);
    pdf.text('Skill', 22, yPos);
    const scoreColWidth = (pageWidth - 75) / data.candidates.length;
    data.candidates.forEach((candidate, index) => {
      pdf.setTextColor(17, 24, 39);
      const shortName = getCandidateName(candidate).substring(0, 10);
      pdf.text(shortName, 75 + (index * scoreColWidth), yPos);
    });
    yPos += 3;
    
    pdf.setFont('helvetica', 'normal');
    
    // Show ALL FIT skills
    const fitSkillNames = ['Empathy', 'Adaptability', 'Leadership', 'Conscientiousness', 'Curiosity', 'Resilience'];
    const fitSkillData = data.skillComparison.filter(skill => 
      fitSkillNames.some(fitSkill => skill.skillName.includes(fitSkill))
    );
    
    fitSkillData.forEach((skill, skillIndex) => {
      pdf.setFontSize(6);
      pdf.setTextColor(55, 65, 81);
      const skillName = skill.skillName.length > 22 ? skill.skillName.substring(0, 20) + '...' : skill.skillName;
      pdf.text(skillName, 22, yPos);
      
      skill.scores.forEach((score, index) => {
        if (score !== null) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(`${score}`, 78 + (index * scoreColWidth), yPos);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text('-', 78 + (index * scoreColWidth), yPos);
        }
      });
      
      yPos += 4;
    });
    
    yPos += 3;
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
    
    // AI Readiness Score Table (compact - keep on same page)
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('AI Readiness Skills Comparison', 20, yPos);
    yPos += 4;
    
    pdf.setFontSize(6);
    pdf.text('Skill', 22, yPos);
    const aiScoreColWidth = (pageWidth - 75) / data.candidates.length;
    data.candidates.forEach((candidate, index) => {
      pdf.setTextColor(17, 24, 39);
      const shortName = getCandidateName(candidate).substring(0, 10);
      pdf.text(shortName, 75 + (index * aiScoreColWidth), yPos);
    });
    yPos += 3;
    
    pdf.setFont('helvetica', 'normal');
    
    // Show ALL AI Readiness skills
    const aiSkillNames = ['Algorithmic Literacy', 'Data Fluency', 'Tool Familiarization', 'Digital Ethics', 'Responsible AI', 'Critical Thinking', 'Adaptive Learning', 'Cross-functional', 'Creative Innovation'];
    const aiSkillData = data.skillComparison.filter(skill => 
      aiSkillNames.some(aiSkill => skill.skillName.includes(aiSkill))
    );
    
    aiSkillData.forEach((skill, skillIndex) => {
      pdf.setFontSize(6);
      pdf.setTextColor(55, 65, 81);
      const skillName = skill.skillName.length > 22 ? skill.skillName.substring(0, 20) + '...' : skill.skillName;
      pdf.text(skillName, 22, yPos);
      
      skill.scores.forEach((score, index) => {
        if (score !== null) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(17, 24, 39);
          pdf.text(`${score}`, 78 + (index * aiScoreColWidth), yPos);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text('-', 78 + (index * aiScoreColWidth), yPos);
        }
      });
      
      yPos += 4;
    });
    
    yPos += 3;
  }
  
  // ========== PAGE 3: DETAILED COMPARISONS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  
  // Prompt Architecture - Bar Chart Comparison
  const hasPrompt = data.promptArchitectureAssessments?.some(a => a !== null);
  if (hasPrompt) {
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE COMPARISON', yPos, pageWidth);
    yPos += 3;
    
    const barChartStartY = yPos;
    const levelHeight = 8;
    const maxBarWidth = 100;
    const chartLeftMargin = 55;
    
    // Draw level labels and bars for each of the 7 levels
    for (let level = 1; level <= 7; level++) {
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Level ${level}`, 25, yPos + 4);
      
      // Draw bars for each candidate side by side
      const barWidth = maxBarWidth / data.candidates.length - 2;
      data.candidates.forEach((candidate, candIndex) => {
        const promptData = data.promptArchitectureAssessments?.[candIndex];
        if (promptData && promptData.levels && promptData.levels[level - 1]) {
          const levelData = promptData.levels[level - 1];
          const score = levelData.totalScore || 0;
          const barLength = (score / 100) * barWidth;
          
          const candidateColor = CANDIDATE_COLORS[candIndex] || [100, 100, 100];
          const barX = chartLeftMargin + (candIndex * (barWidth + 2));
          
          // Background bar
          pdf.setFillColor(229, 231, 235);
          pdf.rect(barX, yPos, barWidth, 5, 'F');
          
          // Score bar
          pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
          pdf.rect(barX, yPos, barLength, 5, 'F');
          
          // Score text
          pdf.setFontSize(5);
          pdf.setTextColor(17, 24, 39);
          pdf.text(`${score}`, barX + barWidth + 2, yPos + 3.5);
        } else {
          const barX = chartLeftMargin + (candIndex * (barWidth + 2));
          pdf.setFillColor(240, 240, 240);
          pdf.rect(barX, yPos, barWidth, 5, 'F');
          pdf.setFontSize(5);
          pdf.setTextColor(150, 150, 150);
          pdf.text('-', barX + barWidth + 2, yPos + 3.5);
        }
      });
      
      yPos += levelHeight;
    }
    
    // Legend
    yPos += 2;
    pdf.setFontSize(5);
    data.candidates.forEach((candidate, index) => {
      const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
      pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
      pdf.rect(chartLeftMargin + (index * 35), yPos, 3, 3, 'F');
      pdf.setTextColor(75, 85, 99);
      const shortName = getCandidateName(candidate).substring(0, 8);
      pdf.text(shortName, chartLeftMargin + (index * 35) + 5, yPos + 2);
    });
    
    yPos += 6;
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
  
  // Top 5 Skills Comparison - Horizontal Bar Chart
  if (yPos > pageHeight - 60) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 35;
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
  
  // Legend
  yPos += 1;
  pdf.setFontSize(5);
  data.candidates.forEach((candidate, index) => {
    const candidateColor = CANDIDATE_COLORS[index] || [100, 100, 100];
    pdf.setFillColor(candidateColor[0], candidateColor[1], candidateColor[2]);
    pdf.rect(25 + (index * 40), yPos, 3, 3, 'F');
    pdf.setTextColor(75, 85, 99);
    const shortName = getCandidateName(candidate).substring(0, 10);
    pdf.text(shortName, 30 + (index * 40), yPos + 2);
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
  
  yPos += 16;
  pdf.setTextColor(0, 0, 0);
  
  // ========== KEY STRENGTHS (on page 1, compact two-column) ==========
  yPos = addSectionHeader(pdf, 'KEY STRENGTHS', yPos, pageWidth);
  yPos += 2;
  
  pdf.setFontSize(9);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Areas where candidate meets or exceeds requirements', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(9);
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
  
  pdf.setFontSize(9);
  pdf.setTextColor(75, 85, 99);
  pdf.text('Skills requiring improvement for better role alignment', 20, yPos);
  yPos += 5;
  
  pdf.setFontSize(9);
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
      
      // Draw required score marker (circle with border)
      pdf.setFillColor(255, 255, 255); // White fill
      pdf.circle(requiredX, skillY, 2, 'F');
      pdf.setDrawColor(107, 114, 128);
      pdf.setLineWidth(1.2);
      pdf.circle(requiredX, skillY, 2, 'D');
      
      // Draw candidate score marker (diamond shape)
      pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
      const diamondSize = 2.5;
      pdf.setLineWidth(0.5);
      // Draw diamond (rotated square)
      const diamondPath = [
        [candidateX, skillY - diamondSize],           // top
        [candidateX + diamondSize, skillY],           // right
        [candidateX, skillY + diamondSize],           // bottom
        [candidateX - diamondSize, skillY],           // left
        [candidateX, skillY - diamondSize]            // close path
      ];
      diamondPath.forEach((point, i) => {
        if (i === 0) return;
        pdf.line(diamondPath[i-1][0], diamondPath[i-1][1], point[0], point[1]);
      });
      // Fill the diamond
      pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
      pdf.triangle(
        candidateX, skillY - diamondSize,
        candidateX + diamondSize, skillY,
        candidateX, skillY + diamondSize,
        'F'
      );
      pdf.triangle(
        candidateX, skillY - diamondSize,
        candidateX - diamondSize, skillY,
        candidateX, skillY + diamondSize,
        'F'
      );
      
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
    
    // Required score legend
    pdf.setFillColor(255, 255, 255);
    pdf.circle(chartMarginLeft + 5, yPos, 2, 'F');
    pdf.setDrawColor(107, 114, 128);
    pdf.setLineWidth(1.2);
    pdf.circle(chartMarginLeft + 5, yPos, 2, 'D');
    pdf.text('Required Score', chartMarginLeft + 11, yPos + 1);
    
    // Candidate score legend (diamond)
    pdf.setFillColor(iconColor[0], iconColor[1], iconColor[2]);
    const legendDiamondSize = 2.5;
    const legendX = chartMarginLeft + 52;
    pdf.triangle(
      legendX, yPos - legendDiamondSize,
      legendX + legendDiamondSize, yPos,
      legendX, yPos + legendDiamondSize,
      'F'
    );
    pdf.triangle(
      legendX, yPos - legendDiamondSize,
      legendX - legendDiamondSize, yPos,
      legendX, yPos + legendDiamondSize,
      'F'
    );
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
