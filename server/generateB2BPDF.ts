import { jsPDF } from 'jspdf';
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logoPath = join(__dirname, '../client/src/lib/pdfAssets.ts');
const pdfAssetsContent = readFileSync(logoPath, 'utf-8');
const logoMatch = pdfAssetsContent.match(/export const HUMANMETRIX_LOGO_BASE64 = '([^']+)'/);
const HUMANMETRIX_LOGO_BASE64 = logoMatch ? logoMatch[1] : '';

const FIT_SKILLS = [
  { key: 'High Agency', legacyKey: 'highAgency', displayName: 'High Agency', description: 'Takes initiative and ownership of outcomes' },
  { key: 'Intellectual Curiosity', legacyKey: 'intellectualCuriosity', displayName: 'Intellectual Curiosity', description: 'Seeks knowledge and understanding' },
  { key: 'Resilience', legacyKey: 'resilience', displayName: 'Resilience', description: 'Adapts and perseveres through challenges' },
  { key: 'Empathy & Ethics', legacyKey: 'empathyEthics', displayName: 'Empathy & Ethics', description: 'Considers impact on others and ethical implications' },
  { key: 'Growth Mindset', legacyKey: 'growthMindset', displayName: 'Growth Mindset', description: 'Views challenges as learning opportunities' },
  { key: 'Interpersonal Agility', legacyKey: 'interpersonalAgility', displayName: 'Interpersonal Agility', description: 'Navigates social dynamics effectively' },
];

function getSkillScore(scores: Record<string, number>, skill: { key: string; legacyKey?: string }): number {
  if (skill.key in scores) {
    return scores[skill.key];
  }
  if (skill.legacyKey && skill.legacyKey in scores) {
    return scores[skill.legacyKey];
  }
  return 0;
}

const AI_READINESS_SKILLS = [
  { key: 'AI Literacy & Prompt Engineering', legacyKey: 'aiLiteracy', displayName: 'AI Literacy & Prompt Engineering', description: 'Understanding AI capabilities and effective prompt engineering' },
  { key: 'Technical Fundamentals', legacyKey: 'technicalFluency', displayName: 'Technical Fundamentals', description: 'Core technical knowledge and system understanding' },
  { key: 'Data Fluency', legacyKey: 'domainFluency', displayName: 'Data Fluency', description: 'Ability to work with and interpret data effectively' },
  { key: 'Critical Thinking & Problem-Solving', legacyKey: 'criticalThinking', displayName: 'Critical Thinking & Problem-Solving', description: 'Analytical reasoning and solution development' },
  { key: 'Adaptability & Continuous Learning', legacyKey: 'adaptiveLearning', displayName: 'Adaptability & Continuous Learning', description: 'Embracing change and ongoing skill development' },
  { key: 'Collaboration & Communication', legacyKey: 'collaboration', displayName: 'Collaboration & Communication', description: 'Effective teamwork and information sharing' },
  { key: 'Responsible AI & Ethical Awareness', legacyKey: 'responsibleAI', displayName: 'Responsible AI & Ethical Awareness', description: 'Ethical AI practices and responsible deployment' },
  { key: 'Creativity & Innovation', legacyKey: 'creativeInnovation', displayName: 'Creativity & Innovation', description: 'Generating novel ideas and innovative solutions' },
  { key: 'Domain Expertise', legacyKey: 'domainExpertise', displayName: 'Domain Expertise', description: 'Deep specialized knowledge in specific field' },
];

const PROMPT_ARCHITECTURE_DIMENSIONS = [
  { displayName: 'Clarity', description: 'Clear and unambiguous instructions' },
  { displayName: 'Structure', description: 'Well-organized prompt format' },
  { displayName: 'Context Relevance', description: 'Appropriate background information' },
  { displayName: 'Creativity', description: 'Innovative prompt approaches' },
  { displayName: 'Iterative Improvement', description: 'Refining prompts based on feedback' },
];

const AIQ_BANDS = [
  { range: '81-100%', title: 'Highly Developed', description: 'Strong ethical AI judgment' },
  { range: '61-80%', title: 'Proficient', description: 'Good awareness with room for growth' },
  { range: '41-60%', title: 'Developing', description: 'Basic understanding, needs development' },
  { range: '21-40%', title: 'Emerging', description: 'Limited awareness of AI ethics' },
  { range: '0-20%', title: 'Foundational', description: 'Minimal understanding of AI ethics' },
];

function addBackgroundPattern(pdf: jsPDF, pageWidth: number, pageHeight: number) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
}

function addHeader(pdf: jsPDF, pageWidth: number) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 32, 'F');
  
  try {
    if (HUMANMETRIX_LOGO_BASE64) {
      pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', -6, -4, 48, 48);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 34, 16);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 34, 24);
  
  pdf.setTextColor(0, 0, 0);
}

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  pdf.text('© HumanMetrix', 15, pageHeight - 8);
  pdf.setTextColor(0, 0, 0);
}

function addSectionHeader(pdf: jsPDF, title: string, yPosition: number, pageWidth: number): number {
  pdf.setDrawColor(243, 244, 246);
  pdf.setFillColor(243, 244, 246);
  pdf.rect(20, yPosition, pageWidth - 40, 12, 'F');
  
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(title, 25, yPosition + 8);
  pdf.setTextColor(0, 0, 0);
  
  return yPosition + 16;
}

function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Excellent', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Good', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Fair', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
}

function getAIQBandInterpretation(score: number): { band: string; title: string; interpretation: string } {
  if (score >= 81) return { band: '81-100%', title: 'Highly Developed', interpretation: 'You demonstrate a strong understanding of AI ethics and responsible AI practices. You consistently make sound judgments regarding AI deployment and governance.' };
  if (score >= 61) return { band: '61-80%', title: 'Proficient', interpretation: 'You show good awareness of AI ethics with some areas for growth. Continue developing your understanding of nuanced ethical considerations.' };
  if (score >= 41) return { band: '41-60%', title: 'Developing', interpretation: 'You have a basic understanding of AI ethics. Focus on learning more about responsible AI practices and ethical frameworks.' };
  if (score >= 21) return { band: '21-40%', title: 'Emerging', interpretation: 'Your AI ethics awareness is limited. Consider taking courses on AI ethics and responsible AI to improve your understanding.' };
  return { band: '0-20%', title: 'Foundational', interpretation: 'You have minimal understanding of AI ethics. We recommend starting with fundamental AI ethics education.' };
}

function ensurePageSpace(pdf: jsPDF, yPos: number, requiredHeight: number, pageHeight: number, pageWidth: number): number {
  if (yPos + requiredHeight > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    return 38;
  }
  return yPos;
}

function addReportGuidePage(pdf: jsPDF, pageWidth: number, pageHeight: number, assessmentType: string): void {
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HOW TO READ YOUR ASSESSMENT REPORT', pageWidth / 2, yPos + 15, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  
  yPos = 75;
  
  const sections = [
    {
      title: 'Understanding Your Scores',
      content: 'Your assessment results are presented as scores from 0-100. These scores reflect your performance relative to our research-validated benchmarks. Higher scores indicate stronger capabilities in each measured area.',
      color: [59, 130, 246] as [number, number, number]
    },
    {
      title: 'Performance Levels',
      content: 'Scores are categorized into performance levels: Excellent (85-100), Good (70-84), Fair (55-69), Developing (40-54), and Needs Development (0-39). Each level indicates your current proficiency and areas for potential growth.',
      color: [34, 197, 94] as [number, number, number]
    },
    {
      title: 'Percentile Rankings',
      content: 'When available, percentile rankings show how your performance compares to other test-takers. Being in the "Top 15%" means you scored higher than 85% of all candidates who have taken this assessment.',
      color: [147, 51, 234] as [number, number, number]
    },
    {
      title: 'Skills Breakdown',
      content: 'Each assessment measures multiple distinct skills or competencies. Review individual skill scores to identify your strongest areas and opportunities for development. This granular view helps prioritize learning and growth.',
      color: [234, 179, 8] as [number, number, number]
    },
  ];
  
  sections.forEach((section) => {
    pdf.setFillColor(section.color[0], section.color[1], section.color[2]);
    pdf.rect(20, yPos, 4, 30, 'F');
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    pdf.text(section.title, 30, yPos + 8);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    const lines = pdf.splitTextToSize(section.content, pageWidth - 55);
    lines.slice(0, 3).forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + 16 + (idx * 5));
    });
    
    yPos += 40;
  });
  
  yPos += 10;
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text('Important Note', 30, yPos + 12);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  const noteText = 'This assessment provides insights into your current capabilities at a specific point in time. Skills and competencies can be developed through learning, practice, and experience. Use these results as a guide for personal and professional growth.';
  const noteLines = pdf.splitTextToSize(noteText, pageWidth - 65);
  noteLines.forEach((line: string, idx: number) => {
    pdf.text(line, 30, yPos + 20 + (idx * 5));
  });
}

function addSkillsLegendPage(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  yPos = addSectionHeader(pdf, 'SKILLS LEGEND', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text('Reference guide for all assessed competencies across the four assessment types', 20, yPos);
  yPos += 8;
  
  const leftMargin = 25;
  const indent = 5;
  const descColumn = 95;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  FIT_SKILLS.forEach((skill) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${skill.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skill.description || '', descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(34, 197, 94);
  pdf.text('AI Readiness - Technical Competencies', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  AI_READINESS_SKILLS.forEach((skill) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${skill.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    const descWidth = pageWidth - descColumn - 15;
    const descLines = pdf.splitTextToSize(skill.description || '', descWidth);
    pdf.text(descLines[0], descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(234, 179, 8);
  pdf.text('Prompt Architecture - Evaluation Dimensions', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  PROMPT_ARCHITECTURE_DIMENSIONS.forEach((dim) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${dim.displayName}:`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dim.description, descColumn, yPos);
    yPos += 5;
  });
  yPos += 4;
  
  if (yPos > pageHeight - 50) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
  }
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(147, 51, 234);
  pdf.text('AIQ - Algorithmic Integrity Quotient Bands', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  AIQ_BANDS.forEach((band) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${band.range} (${band.title}):`, leftMargin + indent, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(band.description, descColumn, yPos);
    yPos += 5;
  });
  
  pdf.setTextColor(0, 0, 0);
}

function drawSkillBar(pdf: jsPDF, skillName: string, score: number, yPos: number, pageWidth: number): number {
  const perf = getPerformanceLevel(score);
  
  pdf.setFillColor(249, 250, 251);
  pdf.rect(20, yPos - 3, pageWidth - 40, 14, 'F');
  
  pdf.setFontSize(9);
  pdf.setTextColor(55, 65, 81);
  pdf.setFont('helvetica', 'normal');
  
  const displayName = skillName.length > 28 ? skillName.substring(0, 25) + '...' : skillName;
  pdf.text(displayName, 25, yPos + 5);
  
  const barWidth = 60;
  const barX = pageWidth - 100;
  const barHeight = 8;
  
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(barX, yPos - 1, barWidth, barHeight, 2, 2, 'F');
  
  pdf.setFillColor(perf.color[0], perf.color[1], perf.color[2]);
  const filledWidth = Math.max(4, (barWidth * score) / 100);
  pdf.roundedRect(barX, yPos - 1, filledWidth, barHeight, 2, 2, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.text(`${score}`, pageWidth - 28, yPos + 5, { align: 'right' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(107, 114, 128);
  pdf.text(perf.label, pageWidth - 25, yPos + 5);
  
  return yPos + 16;
}

function addInterpretationSection(pdf: jsPDF, score: number, assessmentType: string, yPos: number, pageWidth: number): number {
  const perf = getPerformanceLevel(score);
  
  let interpretation = '';
  if (assessmentType === 'fit') {
    if (score >= 85) interpretation = 'Exceptional behavioral competencies across all measured dimensions. Strong foundation for leadership and collaborative roles.';
    else if (score >= 70) interpretation = 'Strong behavioral skills with solid foundations. Well-positioned for roles requiring interpersonal effectiveness and adaptability.';
    else if (score >= 55) interpretation = 'Adequate behavioral competencies with room for growth. Focus on developing specific skills to enhance overall effectiveness.';
    else interpretation = 'Behavioral skills are developing. Consider targeted development programs to strengthen core competencies.';
  } else if (assessmentType === 'ai_readiness' || assessmentType === 'aireadiness') {
    if (score >= 85) interpretation = 'Highly prepared for AI-integrated roles. Strong technical foundation and adaptive capabilities for emerging technologies.';
    else if (score >= 70) interpretation = 'Good AI readiness with solid technical understanding. Well-suited for roles involving AI tools and technologies.';
    else if (score >= 55) interpretation = 'Moderate AI readiness. Consider additional training to strengthen technical and AI-related competencies.';
    else interpretation = 'AI readiness skills are developing. Recommend structured learning programs in AI fundamentals and related technologies.';
  } else if (assessmentType === 'prompt_architecture') {
    if (score >= 85) interpretation = 'Excellent prompt engineering skills. Capable of crafting sophisticated, effective prompts for complex AI interactions.';
    else if (score >= 70) interpretation = 'Good prompt engineering abilities. Competent in creating clear, structured prompts for various AI applications.';
    else if (score >= 55) interpretation = 'Developing prompt engineering skills. Practice with different prompt structures and contexts will enhance effectiveness.';
    else interpretation = 'Prompt engineering skills need development. Consider courses on effective AI prompting techniques.';
  }
  
  if (interpretation) {
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.setLineWidth(1);
    pdf.roundedRect(20, yPos, pageWidth - 40, 28, 3, 3, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text('Interpretation', 30, yPos + 10);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    const lines = pdf.splitTextToSize(interpretation, pageWidth - 65);
    lines.slice(0, 2).forEach((line: string, idx: number) => {
      pdf.text(line, 30, yPos + 18 + (idx * 5));
    });
    
    yPos += 35;
  }
  
  return yPos;
}

export interface B2BAssessmentData {
  candidateName?: string;
  candidateEmail: string;
  assessmentType: string;
  scores: Record<string, number>;
  totalScore?: number;
  percentile?: number;
  evaluations?: any[];
  completedAt: Date;
  partnerCompanyName: string;
}

function formatAssessmentType(type: string): string {
  const mapping: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'ai-readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'Algorithmic Integrity Quotient (AIQ)',
  };
  return mapping[type.toLowerCase()] || type;
}

export function generateB2BResultsPDF(data: B2BAssessmentData): Buffer {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const candidateName = data.candidateName || data.candidateEmail.split('@')[0];
  const assessmentName = formatAssessmentType(data.assessmentType);
  const assessmentLower = data.assessmentType.toLowerCase().replace('-', '_');
  
  addReportGuidePage(pdf, pageWidth, pageHeight, assessmentLower);
  
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 35, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ASSESSMENT RESULTS', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(assessmentName.toUpperCase(), pageWidth / 2, yPos + 22, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.text(`Completed: ${new Date(data.completedAt).toLocaleDateString()}`, pageWidth / 2, yPos + 30, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 82;
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(229, 231, 235);
  pdf.roundedRect(30, yPos, pageWidth - 60, 35, 3, 3, 'FD');
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', pageWidth / 2, yPos + 10, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Name: ${candidateName}`, pageWidth / 2, yPos + 20, { align: 'center' });
  pdf.text(`Assessment for: ${data.partnerCompanyName}`, pageWidth / 2, yPos + 28, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 125;
  
  const overallScore = data.totalScore || Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Object.values(data.scores).length);
  const perf = getPerformanceLevel(overallScore);
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.setLineWidth(2);
  pdf.roundedRect(50, yPos, pageWidth - 100, 50, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('OVERALL SCORE', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(36);
  pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.text(`${overallScore}`, pageWidth / 2 - 15, yPos + 34, { align: 'center' });
  
  pdf.setFontSize(16);
  pdf.text('/100', pageWidth / 2 + 18, yPos + 34, { align: 'left' });
  
  pdf.setFontSize(11);
  pdf.text(perf.label, pageWidth / 2, yPos + 44, { align: 'center' });
  
  if (data.percentile) {
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Top ${100 - data.percentile}% of all test-takers`, pageWidth / 2, yPos + 52, { align: 'center' });
    yPos = 185;
  } else {
    yPos = 182;
  }
  
  yPos = addInterpretationSection(pdf, overallScore, assessmentLower, yPos, pageWidth);
  
  if (assessmentLower === 'fit') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'SKILL SCORES - BEHAVIORAL COMPETENCIES', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your performance across the six core behavioral skills:', 20, yPos);
    yPos += 12;
    
    FIT_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);
      const score = getSkillScore(data.scores, skill);
      yPos = drawSkillBar(pdf, skill.displayName, score, yPos, pageWidth);
    });
    
    yPos += 10;
    
    const sortedSkills = FIT_SKILLS.map(skill => ({
      name: skill.displayName,
      score: getSkillScore(data.scores, skill)
    })).sort((a, b) => b.score - a.score);
    
    const topSkills = sortedSkills.slice(0, 2);
    const developmentAreas = sortedSkills.filter(s => s.score < 60).slice(0, 2);
    
    yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
    
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(34, 197, 94);
    pdf.roundedRect(20, yPos, (pageWidth - 50) / 2, 45, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('Top Strengths', 25, yPos + 12);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    topSkills.forEach((skill, idx) => {
      pdf.text(`• ${skill.name} (${skill.score})`, 28, yPos + 22 + (idx * 8));
    });
    
    const rightBoxX = 25 + (pageWidth - 50) / 2;
    pdf.setFillColor(254, 249, 195);
    pdf.setDrawColor(234, 179, 8);
    pdf.roundedRect(rightBoxX, yPos, (pageWidth - 50) / 2, 45, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(161, 98, 7);
    pdf.text('Development Areas', rightBoxX + 5, yPos + 12);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    if (developmentAreas.length > 0) {
      developmentAreas.forEach((skill, idx) => {
        pdf.text(`• ${skill.name} (${skill.score})`, rightBoxX + 8, yPos + 22 + (idx * 8));
      });
    } else {
      pdf.text('• All skills above threshold', rightBoxX + 8, yPos + 22);
    }
    
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'SKILL SCORES - AI COMPETENCIES', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your performance across the nine AI readiness skills:', 20, yPos);
    yPos += 12;
    
    AI_READINESS_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);
      const score = getSkillScore(data.scores, skill);
      yPos = drawSkillBar(pdf, skill.displayName, score, yPos, pageWidth);
    });
    
    yPos += 10;
    yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
    
    const sortedAISkills = AI_READINESS_SKILLS.map(skill => ({
      name: skill.displayName,
      score: getSkillScore(data.scores, skill)
    })).sort((a, b) => b.score - a.score);
    
    const topAISkills = sortedAISkills.slice(0, 3);
    const devAIAreas = sortedAISkills.filter(s => s.score < 60).slice(0, 3);
    
    pdf.setFillColor(240, 253, 244);
    pdf.setDrawColor(34, 197, 94);
    pdf.roundedRect(20, yPos, (pageWidth - 50) / 2, 55, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 197, 94);
    pdf.text('Top Strengths', 25, yPos + 12);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    topAISkills.forEach((skill, idx) => {
      const shortName = skill.name.length > 22 ? skill.name.substring(0, 20) + '...' : skill.name;
      pdf.text(`• ${shortName} (${skill.score})`, 28, yPos + 22 + (idx * 8));
    });
    
    const rightAIBoxX = 25 + (pageWidth - 50) / 2;
    pdf.setFillColor(254, 249, 195);
    pdf.setDrawColor(234, 179, 8);
    pdf.roundedRect(rightAIBoxX, yPos, (pageWidth - 50) / 2, 55, 3, 3, 'FD');
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(161, 98, 7);
    pdf.text('Development Areas', rightAIBoxX + 5, yPos + 12);
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    if (devAIAreas.length > 0) {
      devAIAreas.forEach((skill, idx) => {
        const shortName = skill.name.length > 22 ? skill.name.substring(0, 20) + '...' : skill.name;
        pdf.text(`• ${shortName} (${skill.score})`, rightAIBoxX + 8, yPos + 22 + (idx * 8));
      });
    } else {
      pdf.text('• All skills above threshold', rightAIBoxX + 8, yPos + 22);
    }
    
  } else if (assessmentLower === 'prompt_architecture') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE RESULTS', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your prompt engineering skills assessed across multiple difficulty levels:', 20, yPos);
    yPos += 15;
    
    if (data.evaluations && data.evaluations.length > 0) {
      data.evaluations.forEach((level: any, idx: number) => {
        yPos = ensurePageSpace(pdf, yPos, 60, pageHeight, pageWidth);
        
        const levelScore = level.totalScore || 0;
        const levelPerf = getPerformanceLevel(levelScore);
        
        pdf.setFillColor(249, 250, 251);
        pdf.setDrawColor(levelPerf.color[0], levelPerf.color[1], levelPerf.color[2]);
        pdf.roundedRect(20, yPos, pageWidth - 40, 50, 3, 3, 'FD');
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`Level ${level.level || idx + 1}`, 28, yPos + 12);
        
        pdf.setTextColor(levelPerf.color[0], levelPerf.color[1], levelPerf.color[2]);
        pdf.text(`Score: ${levelScore}/100`, pageWidth - 35, yPos + 12, { align: 'right' });
        
        let dimY = yPos + 22;
        if (level.scores) {
          Object.entries(level.scores).forEach(([dimension, score]) => {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(75, 85, 99);
            const dimName = dimension.replace(/([A-Z])/g, ' $1').trim();
            pdf.text(`${dimName}: ${score}/20`, 32, dimY);
            dimY += 5;
          });
        }
        
        if (level.feedback) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(107, 114, 128);
          const feedbackLines = pdf.splitTextToSize(`"${level.feedback}"`, pageWidth - 70);
          feedbackLines.slice(0, 2).forEach((line: string, lineIdx: number) => {
            pdf.text(line, 32, dimY + (lineIdx * 4));
          });
        }
        
        yPos += 58;
      });
    }
    
  } else if (assessmentLower === 'aiq') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your AI ethics and responsible AI awareness assessment:', 20, yPos);
    yPos += 15;
    
    const aiqInterpretation = getAIQBandInterpretation(overallScore);
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(147, 51, 234);
    pdf.setLineWidth(2);
    pdf.roundedRect(30, yPos, pageWidth - 60, 65, 3, 3, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234);
    pdf.text(`${aiqInterpretation.title}`, pageWidth / 2, yPos + 15, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.text(`(${aiqInterpretation.band})`, pageWidth / 2, yPos + 25, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    const interpretationLines = pdf.splitTextToSize(aiqInterpretation.interpretation, pageWidth - 80);
    let lineY = yPos + 38;
    interpretationLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, lineY, { align: 'center' });
      lineY += 5;
    });
    
    yPos += 75;
    
    if (data.scores && Object.keys(data.scores).length > 1) {
      yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
      yPos = addSectionHeader(pdf, 'CATEGORY BREAKDOWN', yPos, pageWidth);
      yPos += 8;
      
      Object.entries(data.scores).forEach(([category, score]) => {
        if (category === 'Algorithmic Integrity') return;
        
        yPos = ensurePageSpace(pdf, yPos, 18, pageHeight, pageWidth);
        yPos = drawSkillBar(pdf, category, score, yPos, pageWidth);
      });
    }
  }
  
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight);
  }
  
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
