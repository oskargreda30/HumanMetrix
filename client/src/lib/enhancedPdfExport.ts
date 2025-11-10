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

  // Pre-declare result variables to avoid duplicate declarations
  const fitResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'fit' && r.status === 'completed');
  const aiReadinessResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'ai_readiness' && r.status === 'completed');
  const promptArchResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'prompt_architecture' && r.status === 'completed');
  const aiqResultSummary = candidate.results?.find((r: any) => r.assessmentType === 'aiq' && r.status === 'completed');

  // ========== PAGE 1: COVER PAGE ==========
  let yPos = 30;
  
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
  
  pdf.setFontSize(12);
  pdf.text(candidateName.toUpperCase(), pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Candidate Information Card
  yPos = 110;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(30, yPos, pageWidth - 60, 32, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', pageWidth / 2, yPos + 8, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Name: ${candidateName}`, pageWidth / 2, yPos + 16, { align: 'center' });
  pdf.text(`Email: ${candidate.user.email}`, pageWidth / 2, yPos + 22, { align: 'center' });
  pdf.text(`Assessments Completed: ${candidate.results?.filter((r: any) => r.status === 'completed').length || 0}`, pageWidth / 2, yPos + 28, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  // Calculate overall performance metrics - average across assessment types, not individual skills
  const avgScore = (() => {
    if (!candidate.results || candidate.results.length === 0) return 0;
    
    const completedResults = candidate.results.filter((r: any) => r.status === 'completed');
    if (completedResults.length === 0) return 0;
    
    const assessmentScores: number[] = [];
    
    completedResults.forEach((result: any) => {
      if (result.scores && Object.keys(result.scores).length > 0) {
        // For skill-based assessments, calculate average of scores
        const scores = Object.values(result.scores) as number[];
        const avg = Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length);
        assessmentScores.push(avg);
      } else if (result.totalScore !== null && result.totalScore !== undefined) {
        // For totalScore assessments (AIQ, Prompt Architecture)
        assessmentScores.push(result.totalScore);
      }
    });
    
    if (assessmentScores.length === 0) return 0;
    return Math.round(assessmentScores.reduce((sum, score) => sum + score, 0) / assessmentScores.length);
  })();
  const performance = getPerformanceLevel(avgScore);
  
  // Key Metrics (moved up since Executive Summary removed)
  yPos = 150;
  const boxWidth = (pageWidth - 60) / 3;
  
  const topSkills = [...skills].sort((a, b) => b.score - a.score).slice(0, 3);
  const metricsData = [
    { label: 'Skills Assessed', value: skills.length.toString(), fontSize: 14 },
    { label: 'Average Score', value: `${avgScore}/100`, fontSize: 14 },
    { label: 'Top Skill', value: topSkills[0]?.name.substring(0, 15) || 'N/A', fontSize: 8 },
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
    
    pdf.setFontSize(metric.fontSize);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(metric.value, xPos + (boxWidth - 5) / 2, yPos + 18, { align: 'center' });
  });
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== ASSESSMENT SUMMARY ==========
  yPos = 185 + 10; // Added 10mm spacing
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  yPos += 2;
  
  // FIT Assessment Summary
  if (fitResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const fitAvg = Math.round(Object.values(fitResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(fitResultSummary.scores).length);
    const fitPerf = getPerformanceLevel(fitAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment (Behavioral Skills)', 25, yPos);
    
    pdf.setTextColor(fitPerf.color[0], fitPerf.color[1], fitPerf.color[2]);
    pdf.text(`${fitAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const fitSummary = fitAvg >= 70 
      ? `Strong behavioral competencies including adaptability, curiosity, and interpersonal skills.`
      : `Foundational behavioral skills with growth opportunities in adaptability and interpersonal effectiveness.`;
    const fitLines = pdf.splitTextToSize(fitSummary, pageWidth - 50);
    fitLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += fitLines.length * 3 + 5;
  }
  
  // AI Readiness Summary
  if (aiReadinessResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const aiAvg = Math.round(Object.values(aiReadinessResultSummary.scores).reduce((sum: number, score: any) => sum + score, 0) / Object.values(aiReadinessResultSummary.scores).length);
    const aiPerf = getPerformanceLevel(aiAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(139, 92, 246);
    pdf.text('AI Readiness', 25, yPos);
    
    pdf.setTextColor(aiPerf.color[0], aiPerf.color[1], aiPerf.color[2]);
    pdf.text(`${aiAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const aiSummary = aiAvg >= 70 
      ? `Strong AI literacy with ability to leverage AI tools for productivity multiplication.`
      : `Foundational AI awareness; additional training recommended to fully leverage AI capabilities.`;
    const aiLines = pdf.splitTextToSize(aiSummary, pageWidth - 50);
    aiLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += aiLines.length * 3 + 5;
  }
  
  // Prompt Architecture Summary
  if (promptArchResultSummary && promptArchitectureData && promptArchitectureData.length > 0) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const promptAvg = Math.round(
      promptArchitectureData.reduce((sum, p) => sum + (p.totalScore || 0), 0) / promptArchitectureData.length
    );
    const promptPerf = getPerformanceLevel(promptAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('Prompt Architecture', 25, yPos);
    
    pdf.setTextColor(promptPerf.color[0], promptPerf.color[1], promptPerf.color[2]);
    pdf.text(`${promptAvg}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const promptSummary = promptAvg >= 70 
      ? `Strong prompt engineering skills; capable of designing effective AI interactions.`
      : `Basic prompt engineering ability with room for development in sophisticated AI prompts.`;
    const promptLines = pdf.splitTextToSize(promptSummary, pageWidth - 50);
    promptLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += promptLines.length * 3 + 5;
  }
  
  // AIQ Summary
  if (aiqResultSummary) {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    const aiqScore = aiqResultSummary.totalScore;
    const aiqPerf = getPerformanceLevel(aiqScore);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Algorithmic Integrity Quotient (AIQ)', 25, yPos);
    
    pdf.setTextColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
    pdf.text(`${aiqScore}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 4;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const aiqSummary = aiqScore >= 75 
      ? `Strong ethical understanding of AI systems; trusted for responsible algorithmic deployment decisions.`
      : aiqScore >= 50
      ? `Foundational AI ethics knowledge; additional training recommended before system deployment.`
      : `Significant AI ethics development needed; close supervision and training strongly recommended.`;
    const aiqLines = pdf.splitTextToSize(aiqSummary, pageWidth - 50);
    aiqLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 3));
    });
    yPos += aiqLines.length * 3 + 5;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 2: UNDERSTANDING THE ASSESSMENTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'UNDERSTANDING THE ASSESSMENTS', yPos, pageWidth);
  yPos += 5;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  const introText = pdf.splitTextToSize(
    'This report evaluates the candidate across four critical dimensions of AI-era workplace performance. Each assessment measures specific competencies that predict success in modern, AI-augmented work environments.',
    pageWidth - 40
  );
  introText.forEach((line: string, index: number) => {
    pdf.text(line, 20, yPos + (index * 4));
  });
  yPos += introText.length * 4 + 5;
  
  // Helper function to add assessment explanation box
  const addAssessmentBox = (
    title: string,
    titleColor: [number, number, number],
    bgColor: [number, number, number],
    borderColor: [number, number, number],
    whatItMeasures: string,
    workplaceImpact: string,
    currentY: number
  ): number => {
    // Calculate required height first with smaller text
    pdf.setFontSize(8);
    const measuresText = pdf.splitTextToSize(whatItMeasures, pageWidth - 50);
    const impactText = pdf.splitTextToSize(workplaceImpact, pageWidth - 50);
    const boxHeight = 11 + 5 + (measuresText.length * 3.5) + 2 + 5 + (impactText.length * 3.5) + 4;
    
    // Check if we need a new page
    if (currentY + boxHeight > pageHeight - 30) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      currentY = 35;
    }
    
    const startY = currentY;
    
    // Draw box
    pdf.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    pdf.roundedRect(20, startY, pageWidth - 40, boxHeight, 2, 2, 'FD');
    
    // Render content
    let textY = startY + 6;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    pdf.text(title, 25, textY);
    textY += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('What It Measures:', 25, textY);
    textY += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    measuresText.forEach((line: string) => {
      pdf.text(line, 25, textY);
      textY += 3.5;
    });
    textY += 2;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text('Workplace Impact:', 25, textY);
    textY += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    impactText.forEach((line: string) => {
      pdf.text(line, 25, textY);
      textY += 3.5;
    });
    
    return currentY + boxHeight + 4;
  };
  
  // FIT Assessment Explanation
  yPos = addAssessmentBox(
    'FIT ASSESSMENT (15 Questions)',
    [59, 130, 246],
    [239, 246, 255],
    [59, 130, 246],
    'Six core behavioral skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics, Growth Mindset, and Interpersonal Agility.',
    'Predicts adaptability, initiative, collaboration quality, and resilience under pressure. High scorers drive innovation, navigate ambiguity effectively, and build strong team dynamics.',
    yPos
  );
  
  // AI Readiness Assessment Explanation
  yPos = addAssessmentBox(
    'AI READINESS ASSESSMENT (21 Questions)',
    [147, 51, 234],
    [243, 232, 255],
    [147, 51, 234],
    'Nine AI-specific competencies including AI Literacy, Prompting Effectiveness, Technical Fluency, Critical Thinking, Adaptive Learning, Responsible AI Integration, Domain Expertise, Creative Innovation, and Cross-functional Collaboration.',
    'Determines ability to leverage AI tools for productivity gains, make sound AI-assisted decisions, and integrate AI responsibly into workflows. High scorers multiply their output through effective AI collaboration.',
    yPos
  );
  
  // Prompt Architecture Assessment Explanation
  yPos = addAssessmentBox(
    'PROMPT ARCHITECTURE ASSESSMENT (7 Levels)',
    [245, 158, 11],
    [254, 243, 199],
    [245, 158, 11],
    'Prompt engineering expertise across five dimensions: Clarity (25%), Structure (20%), Context Relevance (20%), Creativity (20%), and Iterative Improvement (15%). Progressive difficulty levels test real-world prompting skills.',
    'Directly correlates with AI productivity. Skilled prompt engineers extract 3-5x more value from AI tools, solve complex problems faster, and produce higher-quality AI-assisted outputs.',
    yPos
  );
  
  // AIQ Assessment Explanation
  yPos = addAssessmentBox(
    'ALGORITHMIC INTEGRITY QUOTIENT (AIQ) (4 Questions)',
    [59, 130, 246],
    [239, 246, 255],
    [59, 130, 246],
    'Understanding of AI ethics, bias detection, fairness, transparency, and responsible deployment. Tests decision-making in scenarios involving algorithmic systems and their societal impact.',
    'Critical for reducing AI deployment risks and ensuring compliance. High scorers identify bias early, implement fair AI systems, and make ethically sound decisions that protect brand reputation and avoid regulatory issues.',
    yPos
  );
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PAGE 3: RADAR CHARTS ==========
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS VISUALIZATION', yPos, pageWidth);
  yPos += 5;
  const addIndividualScores = (skillsList: SkillData[], yPosition: number): number => {
    let currentY = yPosition;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Individual Skill Scores:', 20, currentY);
    currentY += 6;
    
    const colWidth = (pageWidth - 40) / 3;
    skillsList.forEach((skill, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const xPos = 20 + (col * colWidth);
      const yPosRow = currentY + (row * 6);
      
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      pdf.text(`${skill.name}:`, xPos, yPosRow);
      
      const perf = getPerformanceLevel(skill.score);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
      pdf.text(`${skill.score}`, xPos + colWidth - 15, yPosRow);
    });
    
    return currentY + (Math.ceil(skillsList.length / 3) * 6) + 5;
  };
  
  // FIT Assessment Radar Chart
  const fitSkills = skills.filter(s => s.assessment === 'FIT Assessment');
  if (radarChartImages?.fit && fitSkills.length > 0) {
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
      // Smaller chart to fit both on one page
      const imgProps = pdf.getImageProperties(radarChartImages.fit);
      const maxWidth = pageWidth - 40;
      const maxHeight = 55; // Reduced from 90 to fit both charts
      
      let chartWidth = maxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(radarChartImages.fit, 'PNG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 3;
      
      // Add individual scores in compact format
      yPos = addIndividualScores(fitSkills, yPos);
      yPos += 8;
    } catch (error) {
      console.error('Error adding FIT chart:', error);
      yPos += 10;
    }
  }
  
  // AI Readiness Radar Chart (on same page)
  const aiReadinessSkills = skills.filter(s => s.assessment === 'AI Readiness');
  if (radarChartImages?.aiReadiness && aiReadinessSkills.length > 0) {
    // No page break - keep on same page
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
      // Smaller chart to fit both on one page
      const imgProps = pdf.getImageProperties(radarChartImages.aiReadiness);
      const maxWidth = pageWidth - 40;
      const maxHeight = 55; // Reduced from 90 to fit both charts
      
      let chartWidth = maxWidth;
      let chartHeight = (imgProps.height / imgProps.width) * chartWidth;
      
      if (chartHeight > maxHeight) {
        chartHeight = maxHeight;
        chartWidth = (imgProps.width / imgProps.height) * chartHeight;
      }
      
      const chartX = (pageWidth - chartWidth) / 2;
      pdf.addImage(radarChartImages.aiReadiness, 'PNG', chartX, yPos, chartWidth, chartHeight);
      yPos += chartHeight + 3;
      
      // Add individual scores in compact format
      yPos = addIndividualScores(aiReadinessSkills, yPos);
      yPos += 5;
    } catch (error) {
      console.error('Error adding AI Readiness chart:', error);
      yPos += 10;
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== PROMPT ARCHITECTURE ASSESSMENT ==========
  if (promptArchitectureData && promptArchitectureData.length > 0) {
    // Check if we need a new page
    if (yPos > pageHeight - 60) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Progressive evaluation of prompt engineering skills across 7 difficulty levels', 20, yPos);
    yPos += 10;
    
    // Overall score card
    const completedLevels = promptArchitectureData.filter(p => p.totalScore !== undefined);
    if (completedLevels.length > 0) {
      const avgScore = Math.round(
        completedLevels.reduce((sum, p) => sum + (p.totalScore || 0), 0) / completedLevels.length
      );
      const performance = getPerformanceLevel(avgScore);
      
      // Compact score box - reduced height from 24 to 18
      const promptBoxWidth = 70;
      const promptBoxX = (pageWidth - promptBoxWidth) / 2;
      
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(promptBoxX, yPos, promptBoxWidth, 18, 2, 2, 'FD');
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Overall Prompt Engineering Score', pageWidth / 2, yPos + 5, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(performance.color[0], performance.color[1], performance.color[2]);
      pdf.text(`${avgScore}/100`, pageWidth / 2, yPos + 11, { align: 'center' });
      
      pdf.setFontSize(5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${completedLevels.length} level(s) completed`, pageWidth / 2, yPos + 15, { align: 'center' });
      
      yPos += 22;
    }
    
    pdf.setTextColor(0, 0, 0);
    
    // Individual level results - clean list format with progress bars
    const barHeight = 6;
    const barSpacing = 8;
    const barWidth = pageWidth - 100;
    
    promptArchitectureData.forEach((prompt, index) => {
      // Check if we need a new page
      if (yPos + barSpacing > pageHeight - 25) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      // Level label
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text(`Level ${prompt.level}`, 20, yPos + 4.5);
      
      // Progress bar background
      pdf.setFillColor(243, 244, 246);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(50, yPos, barWidth, barHeight, 1, 1, 'FD');
      
      if (prompt.totalScore !== undefined) {
        const perf = getPerformanceLevel(prompt.totalScore);
        const fillWidth = (prompt.totalScore / 100) * barWidth;
        
        // Progress bar fill
        pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
        if (fillWidth > 0) {
          pdf.roundedRect(50, yPos, fillWidth, barHeight, 1, 1, 'F');
        }
        
        // Score text on the right
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
        pdf.text(`${prompt.totalScore}`, 50 + barWidth + 5, yPos + 4.5);
        
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        pdf.text('/100', 50 + barWidth + 12, yPos + 4.5);
      } else {
        // Not completed
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(156, 163, 175);
        pdf.text('Not completed', 50 + barWidth / 2, yPos + 8, { align: 'center' });
      }
      
      yPos += barSpacing;
    });
    
    yPos += 5;
    
    // Add legend underneath
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos += 5; // Added spacing before "Assessed Dimensions"
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Assessed Dimensions:', 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Clarity (20%) • Structure (20%) • Context Relevance (20%) • Creativity (20%) • Iterative Improvement (20%)', 20, yPos);
    yPos += 10;
    
    pdf.setTextColor(0, 0, 0);
  }
  
  // ========== AIQ ASSESSMENT ==========
  const aiqResult = candidate.results?.find((r: any) => 
    r.assessmentType === 'aiq' && r.status === 'completed'
  );
  
  if (aiqResult && aiqResult.totalScore !== null && aiqResult.totalScore !== undefined) {
    if (yPos > pageHeight - 80) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text('Measures: AI Ethics, Bias Detection, Fairness, Transparency, and Responsible AI Deployment', 20, yPos);
    yPos += 8;
    
    // Score display - compact centered box - reduced height from 20 to 15
    const boxWidth = 55;
    const boxX = (pageWidth - boxWidth) / 2;
    
    pdf.setFillColor(239, 246, 255);
    pdf.setDrawColor(59, 130, 246);
    pdf.roundedRect(boxX, yPos, boxWidth, 15, 2, 2, 'FD');
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text(`${aiqResult.totalScore}/100`, pageWidth / 2, yPos + 8, { align: 'center' });
    
    pdf.setFontSize(6);
    pdf.setTextColor(75, 85, 99);
    pdf.text('Overall AIQ Score', pageWidth / 2, yPos + 12, { align: 'center' });
    
    yPos += 20;
    
    // Performance interpretation
    const aiqPerf = getPerformanceLevel(aiqResult.totalScore);
    let interpretation = '';
    if (aiqResult.totalScore >= 75) {
      interpretation = 'Demonstrates strong understanding of AI ethics and responsible deployment. Can be trusted to make sound decisions regarding algorithmic systems and identify potential risks early.';
    } else if (aiqResult.totalScore >= 50) {
      interpretation = 'Shows foundational knowledge of AI ethics. May benefit from additional training in bias detection, fairness principles, and responsible AI practices.';
    } else {
      interpretation = 'Requires significant development in AI ethics and responsible deployment practices. Additional training and guidance strongly recommended before working with AI systems.';
    }
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(aiqPerf.color[0], aiqPerf.color[1], aiqPerf.color[2]);
    pdf.text(`Performance Level: ${aiqPerf.label}`, 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    const aiqInterpretation = pdf.splitTextToSize(interpretation, pageWidth - 40);
    aiqInterpretation.forEach((line: string, index: number) => {
      pdf.text(line, 20, yPos + (index * 4));
    });
    yPos += aiqInterpretation.length * 4 + 10;
  }
  
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
    
    roleComparison.alignment.gaps?.slice(0, 5).forEach((area, index) => {
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
    if (roleComparison.alignment.recommendations) {
      yPos += 5;
      
      if (yPos > pageHeight - 80) {
        pdf.addPage();
        addHeader(pdf, pageWidth);
        yPos = 35;
      }
      
      yPos = addSectionHeader(pdf, 'HIRING RECOMMENDATIONS', yPos, pageWidth);
      yPos += 5;
      
      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(25, yPos, pageWidth - 50, 20, 2, 2, 'FD');
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(17, 24, 39);
      const recLines = pdf.splitTextToSize(roleComparison.alignment.recommendations, pageWidth - 60);
      recLines.forEach((line: string, lineIndex: number) => {
        if (yPos > pageHeight - 40) {
          pdf.addPage();
          addHeader(pdf, pageWidth);
          yPos = 35;
        }
        pdf.text(line, 30, yPos + 7 + (lineIndex * 4));
      });
      
      yPos += Math.max(20, recLines.length * 4 + 10);
    }
  }
  
  pdf.setTextColor(0, 0, 0);
  
  // ========== RECOMMENDATIONS SECTION ==========
  // Try to fit on same page (no page break check - let it flow naturally)
  
  // Recommendations Section
  yPos = addSectionHeader(pdf, 'FINAL CANDIDATE RECOMMENDATIONS', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  
  const topStrengths = [...skills].sort((a, b) => b.score - a.score).slice(0, 2);
  const developmentAreas = [...skills].filter(s => s.score > 0).sort((a, b) => a.score - b.score).slice(0, 2);
  
  const candidateRecs = [
    `• Leverage your strongest areas (${topStrengths.map(s => s.name).join(', ')}) to drive immediate impact in your role.`,
    developmentAreas.length > 0 
      ? `• Focus development efforts on ${developmentAreas.map(s => s.name).join(' and ')}, which will significantly enhance your overall effectiveness.`
      : '• Continue building on your strengths across all assessed competencies.',
    avgScore >= 70 
      ? '• Consider mentoring others in AI adoption and best practices, as your strong foundation positions you as a potential champion.'
      : '• Seek out formal training programs or workshops in AI literacy and prompt engineering to accelerate your AI competency development.',
  ];
  
  candidateRecs.forEach((rec) => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    const recLines = pdf.splitTextToSize(rec, pageWidth - 55);
    recLines.forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + (idx * 4));
    });
    yPos += recLines.length * 4 + 2;
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
