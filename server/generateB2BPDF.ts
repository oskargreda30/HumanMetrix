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
  pdf.rect(0, 0, pageWidth, 45, 'F');
  
  try {
    if (HUMANMETRIX_LOGO_BASE64) {
      pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', 8, 4, 38, 38);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 42, 20);
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(59, 130, 246);
  pdf.text('AI-Powered Assessment Platform', 42, 24);
  
  pdf.setTextColor(0, 0, 0);
}

function addFooter(pdf: jsPDF, pageNum: number, totalPages: number, pageWidth: number, pageHeight: number, includeSkillsLegendNote: boolean = true) {
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  
  if (includeSkillsLegendNote && pageNum < totalPages) {
    pdf.setFontSize(7);
    pdf.text('Skills Legend available on last page', pageWidth / 2, pageHeight - 12, { align: 'center' });
    pdf.setFontSize(8);
  }
  
  pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 15, pageHeight - 8, { align: 'right' });
  pdf.text('© HumanMetrix', 15, pageHeight - 8);
  pdf.setTextColor(0, 0, 0);
}

function addSectionHeader(pdf: jsPDF, title: string, yPosition: number, pageWidth: number): number {
  const adjustedY = yPosition + 4;
  
  pdf.setDrawColor(243, 244, 246);
  pdf.setFillColor(243, 244, 246);
  pdf.rect(20, adjustedY, pageWidth - 40, 9, 'F');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(17, 24, 39);
  pdf.text(title, 25, adjustedY + 6);
  pdf.setTextColor(0, 0, 0);
  
  return adjustedY + 12;
}

function getPerformanceLevel(score: number): { label: string; color: [number, number, number] } {
  if (score >= 85) return { label: 'Exceptional', color: [34, 197, 94] };
  if (score >= 70) return { label: 'Strong', color: [59, 130, 246] };
  if (score >= 55) return { label: 'Competent', color: [234, 179, 8] };
  if (score >= 40) return { label: 'Developing', color: [249, 115, 22] };
  return { label: 'Needs Development', color: [239, 68, 68] };
}

function getBlueShadeColor(score: number): [number, number, number] {
  if (score >= 80) return [30, 64, 175];
  if (score >= 60) return [37, 99, 235];
  if (score >= 40) return [59, 130, 246];
  if (score >= 20) return [96, 165, 250];
  return [147, 197, 253];
}

function getAIQBandColor(score: number): [number, number, number] {
  if (score >= 80) return [34, 197, 94];
  if (score >= 60) return [59, 130, 246];
  if (score >= 40) return [245, 158, 11];
  if (score >= 20) return [249, 115, 22];
  return [239, 68, 68];
}

function getAIQBandInterpretation(score: number): { band: string; title: string; description: string } {
  if (score >= 81) return { band: '81-100%', title: 'Highly Developed', description: 'You demonstrate a strong understanding of AI ethics and responsible AI practices. You consistently make sound judgments regarding AI deployment and governance.' };
  if (score >= 61) return { band: '61-80%', title: 'Proficient', description: 'You show good awareness of AI ethics with some areas for growth. Continue developing your understanding of nuanced ethical considerations.' };
  if (score >= 41) return { band: '41-60%', title: 'Developing', description: 'You have a basic understanding of AI ethics. Focus on learning more about responsible AI practices and ethical frameworks.' };
  if (score >= 21) return { band: '21-40%', title: 'Emerging', description: 'Your AI ethics awareness is limited. Consider taking courses on AI ethics and responsible AI to improve your understanding.' };
  return { band: '0-20%', title: 'Foundational', description: 'You have minimal understanding of AI ethics. We recommend starting with fundamental AI ethics education.' };
}

function getPromptLevelColor(level: number): [number, number, number] {
  if (level <= 2) return [147, 197, 253];
  if (level <= 5) return [59, 130, 246];
  return [37, 99, 235];
}

function ensurePageSpace(pdf: jsPDF, yPos: number, requiredHeight: number, pageHeight: number, pageWidth: number): number {
  if (yPos + requiredHeight > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    return 45;
  }
  return yPos;
}

function fitMetricValue(pdf: jsPDF, text: string, maxWidth: number, initialFontSize: number = 14, minFontSize: number = 10): { text: string; fontSize: number } {
  let fontSize = initialFontSize;
  let fittedText = text;
  
  while (fontSize >= minFontSize) {
    pdf.setFontSize(fontSize);
    const textWidth = pdf.getStringUnitWidth(fittedText) * fontSize / pdf.internal.scaleFactor;
    
    if (textWidth <= maxWidth) {
      return { text: fittedText, fontSize };
    }
    
    fontSize -= 0.5;
  }
  
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

function addReportGuidePage(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 38;
  
  pdf.setFillColor(59, 130, 246);
  pdf.rect(0, yPos, pageWidth, 28, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HOW TO READ OUR REPORTS', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A guide to understanding your assessment results', pageWidth / 2, yPos + 21, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 75;
  
  const addGuideItem = (num: number, title: string, description: string, y: number): number => {
    pdf.setFillColor(59, 130, 246);
    pdf.circle(25, y, 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(String(num), 25, y + 1, { align: 'center' });
    
    pdf.setTextColor(17, 24, 39);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, 34, y + 1);
    
    pdf.setTextColor(75, 85, 99);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    const lines = pdf.splitTextToSize(description, pageWidth - 55);
    lines.forEach((line: string, idx: number) => {
      pdf.text(line, 34, y + 7 + (idx * 5));
    });
    
    return y + 10 + (lines.length * 5) + 6;
  };
  
  yPos = addGuideItem(1, 'Understanding Trait-Based Scores', 
    'FIT and AI Readiness are trait-based assessments. A high score means the trait is strongly present - whether this is beneficial depends on what the specific role requires.', yPos);
  
  yPos = addGuideItem(2, 'FIT Assessment (Behavioral)', 
    'Measures 6 behavioral traits (e.g., High Agency, Resilience). Higher scores indicate stronger trait presence. Match against role requirements to assess fit.', yPos);
  
  yPos = addGuideItem(3, 'AI Readiness (Technical)', 
    'Measures 9 AI-related capabilities including AI Literacy, Change Adaptability, and Data Fluency. Higher scores indicate stronger aptitude in each area.', yPos);
  
  yPos = addGuideItem(4, 'Prompt Architecture', 
    'Evaluates AI prompt engineering skills across 7 difficulty levels. Each level tests clarity, structure, context relevance, creativity, and iterative improvement.', yPos);
  
  yPos = addGuideItem(5, 'AIQ (Ethics)', 
    'Algorithmic Integrity Quotient - measures understanding of AI ethics, bias, fairness, and responsible AI practices. Scores: 81-100 Highly Developed, 61-80 Proficient, 41-60 Developing, 21-40 Emerging, 0-20 Foundational.', yPos);
  
  yPos = addGuideItem(6, 'Skills Legend', 
    'The final page contains a complete reference of all assessed competencies with detailed descriptions. Use this to understand what each skill measures.', yPos);
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
  pdf.setTextColor(59, 130, 246);
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
  pdf.setTextColor(59, 130, 246);
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
  pdf.setTextColor(59, 130, 246);
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
  const blueColor = getBlueShadeColor(score);
  
  pdf.setFillColor(249, 250, 251);
  pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  pdf.setFont('helvetica', 'normal');
  
  const displayName = skillName.length > 30 ? skillName.substring(0, 27) + '...' : skillName;
  pdf.text(displayName, 25, yPos + 4);
  
  const barWidth = 55;
  const barX = pageWidth - 95;
  const barHeight = 6;
  
  pdf.setFillColor(229, 231, 235);
  pdf.roundedRect(barX, yPos, barWidth, barHeight, 2, 2, 'F');
  
  pdf.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  const filledWidth = Math.max(4, (barWidth * score) / 100);
  pdf.roundedRect(barX, yPos, filledWidth, barHeight, 2, 2, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  pdf.text(`${score}`, pageWidth - 28, yPos + 4, { align: 'right' });
  
  return yPos + 14;
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

interface RoleRecommendations {
  suitableRoles: string[];
  thrivingEnvironments: string[];
  roleStrengths: string[];
}

function generateRoleRecommendations(
  assessmentType: string,
  avgScore: number
): RoleRecommendations {
  const assessmentLower = assessmentType.toLowerCase().replace('-', '_');
  
  const roleMap: Record<string, string[]> = {
    fit: [
      'Team Leader - Strong interpersonal skills and adaptability suit leadership positions.',
      'Project Manager - Collaborative nature and resilience enable effective project delivery.',
      'HR Business Partner - People-focused skills translate well to human resources functions.',
      'Customer Success Manager - Relationship-building abilities drive client retention.',
    ],
    ai_readiness: [
      'Business Analyst - Systematic thinking enables data-driven decision making.',
      'Digital Transformation Lead - AI literacy positions them to drive modernization initiatives.',
      'Innovation Manager - Technical awareness combined with strategic thinking suits innovation roles.',
      'Strategy Consultant - Ability to evaluate AI opportunities informs business recommendations.',
    ],
    prompt_architecture: [
      'Technical Writer - Clear communication skills translate complex concepts effectively.',
      'Content Strategist - Structured thinking enables cohesive content planning.',
      'Knowledge Manager - Information organization abilities support institutional learning.',
      'Communications Specialist - Precision in language suits stakeholder engagement.',
    ],
    aiq: [
      'Compliance Officer - Ethical judgment supports regulatory adherence.',
      'Risk Analyst - Principled decision-making identifies potential issues early.',
      'Quality Assurance Lead - Attention to standards ensures consistent outputs.',
      'Policy Advisor - Ethical reasoning informs governance recommendations.',
    ],
  };
  
  const environmentMap: Record<string, string[]> = {
    fit: [
      'Collaborative team settings with regular interaction',
      'Dynamic environments requiring adaptability',
      'Roles involving mentoring or coaching others',
      'Organizations valuing interpersonal relationships',
    ],
    ai_readiness: [
      'Forward-thinking organizations embracing technology',
      'Data-driven decision-making cultures',
      'Environments encouraging continuous learning',
      'Roles bridging technical and business functions',
    ],
    prompt_architecture: [
      'Environments requiring clear documentation',
      'Roles involving training or knowledge transfer',
      'Organizations prioritizing communication excellence',
      'Settings requiring translation of complex information',
    ],
    aiq: [
      'Organizations with strong ethical frameworks',
      'Regulated industries requiring compliance focus',
      'Environments valuing transparency and accountability',
      'Roles requiring careful risk assessment',
    ],
  };
  
  const strengthMap: Record<string, string[]> = {
    fit: [
      'Building and maintaining productive working relationships',
      'Adapting to changing priorities and environments',
      'Facilitating collaboration across diverse teams',
      'Navigating ambiguity with resilience',
    ],
    ai_readiness: [
      'Evaluating technology solutions for business problems',
      'Identifying opportunities for process improvement',
      'Bridging communication between technical and non-technical stakeholders',
      'Staying current with emerging tools and methodologies',
    ],
    prompt_architecture: [
      'Articulating requirements with precision and clarity',
      'Structuring information for maximum comprehension',
      'Creating documentation that drives consistent understanding',
      'Translating complex concepts into actionable guidance',
    ],
    aiq: [
      'Identifying potential risks before they become problems',
      'Making principled decisions under uncertainty',
      'Evaluating options against ethical frameworks',
      'Building trust through consistent, fair judgment',
    ],
  };
  
  const key = assessmentLower === 'aireadiness' ? 'ai_readiness' : assessmentLower;
  
  const suitableRoles = roleMap[key]?.slice(0, 3) || roleMap.fit.slice(0, 3);
  const thrivingEnvironments = environmentMap[key]?.slice(0, 3) || environmentMap.fit.slice(0, 3);
  const roleStrengths = strengthMap[key]?.slice(0, 3) || strengthMap.fit.slice(0, 3);
  
  return { suitableRoles, thrivingEnvironments, roleStrengths };
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

export function generateB2BResultsPDF(data: B2BAssessmentData): Buffer {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  const candidateName = data.candidateName || data.candidateEmail.split('@')[0];
  const assessmentName = formatAssessmentType(data.assessmentType);
  const assessmentLower = data.assessmentType.toLowerCase().replace('-', '_');
  
  addReportGuidePage(pdf, pageWidth, pageHeight);
  
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  let yPos = 50;
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
  pdf.setFont('helvetica', 'bold');
  pdf.text(candidateName.toUpperCase(), pageWidth / 2, yPos + 35, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  const leftMargin = 20;
  const rightMargin = 20;
  const totalBoxWidth = pageWidth - leftMargin - rightMargin;
  const boxGap = 5;
  
  yPos = 110;
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(191, 219, 254);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(leftMargin, yPos, totalBoxWidth, 32, 3, 3, 'FD');
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('CANDIDATE PROFILE', leftMargin + totalBoxWidth / 2, yPos + 8, { align: 'center' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Name: ${candidateName}`, leftMargin + totalBoxWidth / 2, yPos + 16, { align: 'center' });
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Email: ${data.candidateEmail}`, leftMargin + totalBoxWidth / 2, yPos + 22, { align: 'center' });
  pdf.text(`Assessments Completed: 1`, leftMargin + totalBoxWidth / 2, yPos + 28, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  
  const skillNames: string[] = [];
  const skillScores: number[] = [];
  
  if (assessmentLower === 'fit') {
    FIT_SKILLS.forEach(skill => {
      skillNames.push(skill.displayName);
      skillScores.push(getSkillScore(data.scores, skill));
    });
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    AI_READINESS_SKILLS.forEach(skill => {
      skillNames.push(skill.displayName);
      skillScores.push(getSkillScore(data.scores, skill));
    });
  }
  
  const topSkillName = skillNames.length > 0
    ? skillNames[skillScores.indexOf(Math.max(...skillScores))]
    : assessmentName;
  
  yPos = 150;
  const metricBoxWidth = (totalBoxWidth - boxGap) / 2;
  
  const metricsData = [
    { label: 'Skills Assessed', value: String(skillNames.length || Object.keys(data.scores).length) },
    { label: 'Top Skill', value: topSkillName },
  ];
  
  metricsData.forEach((metric, index) => {
    const xPos = leftMargin + (index * (metricBoxWidth + boxGap));
    const boxInnerWidth = metricBoxWidth;
    
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(191, 219, 254);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(xPos, yPos, boxInnerWidth, 28, 2, 2, 'FD');
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(107, 114, 128);
    pdf.text(metric.label, xPos + boxInnerWidth / 2, yPos + 6, { align: 'center' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(17, 24, 39);
    
    if (metric.label === 'Top Skill') {
      pdf.setFontSize(8);
      const maxTextWidth = boxInnerWidth - 6;
      const lines = pdf.splitTextToSize(metric.value, maxTextWidth);
      const lineHeight = 4;
      const startY = lines.length > 1 ? yPos + 13 : yPos + 16;
      lines.slice(0, 2).forEach((line: string, lineIdx: number) => {
        pdf.text(line, xPos + boxInnerWidth / 2, startY + (lineIdx * lineHeight), { align: 'center' });
      });
    } else {
      const maxValueWidth = boxInnerWidth - 4;
      const fitted = fitMetricValue(pdf, metric.value, maxValueWidth, 10, 7);
      pdf.setFontSize(fitted.fontSize);
      pdf.text(fitted.text, xPos + boxInnerWidth / 2, yPos + 18, { align: 'center' });
    }
  });
  
  pdf.setTextColor(0, 0, 0);
  
  yPos = 188 + 10;
  yPos = addSectionHeader(pdf, 'ASSESSMENT SUMMARY', yPos, pageWidth);
  yPos += 2;
  
  const overallScore = data.totalScore || Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(data.scores).length, 1));
  const perf = getPerformanceLevel(overallScore);
  
  if (assessmentLower === 'fit') {
    const fitAvg = Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(data.scores).length, 1));
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
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    const aiAvg = Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(data.scores).length, 1));
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
  } else if (assessmentLower === 'prompt_architecture') {
    const promptAvg = overallScore;
    const promptPerf = getPerformanceLevel(promptAvg);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
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
  } else if (assessmentLower === 'aiq') {
    const aiqScore = overallScore;
    const aiqBandColor = getAIQBandColor(aiqScore);
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Algorithmic Integrity Quotient (AIQ)', 25, yPos);
    
    pdf.setTextColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.text(`${aiqScore}/100`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 8;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 35;
  yPos = addSectionHeader(pdf, 'SKILLS VISUALIZATION', yPos, pageWidth);
  yPos += 5;
  
  if (assessmentLower === 'fit') {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
    yPos += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics,', 52, yPos);
    yPos += 4;
    pdf.text('Growth Mindset, and Interpersonal Agility.', 20, yPos);
    yPos += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Individual Skill Scores:', 20, yPos);
    yPos += 8;
    
    FIT_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 16, pageHeight, pageWidth);
      const score = getSkillScore(data.scores, skill);
      yPos = drawSkillBar(pdf, skill.displayName, score, yPos, pageWidth);
    });
    yPos += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Predicts adaptability, initiative, collaboration quality, and resilience under pressure.', 52, yPos);
    yPos += 4;
    pdf.text('High scorers drive innovation and navigate ambiguity effectively.', 20, yPos);
    yPos += 10;
    
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('AI Readiness Assessment', 20, yPos);
    yPos += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Nine AI-specific competencies: AI Literacy & Prompt Engineering, Technical Fundamentals,', 52, yPos);
    yPos += 4;
    pdf.text('Data Fluency, Critical Thinking & Problem-Solving, Adaptability & Continuous Learning,', 20, yPos);
    yPos += 4;
    pdf.text('Collaboration & Communication, Responsible AI & Ethical Awareness, Creativity & Innovation, Domain Expertise.', 20, yPos);
    yPos += 8;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Individual Skill Scores:', 20, yPos);
    yPos += 8;
    
    AI_READINESS_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 16, pageHeight, pageWidth);
      const score = getSkillScore(data.scores, skill);
      yPos = drawSkillBar(pdf, skill.displayName, score, yPos, pageWidth);
    });
    yPos += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Determines ability to leverage AI tools for productivity gains, make sound AI-assisted decisions,', 52, yPos);
    yPos += 4;
    pdf.text('and integrate AI responsibly into workflows. High scorers multiply their output through effective AI collaboration.', 20, yPos);
    yPos += 10;
    
  } else if (assessmentLower === 'prompt_architecture') {
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos - 5, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Prompt engineering expertise across five equal dimensions (20% each): Clarity, Structure,', 52, yPos);
    yPos += 4;
    pdf.text('Context Relevance, Creativity, and Iterative Improvement. Progressive difficulty levels test real-world prompting skills.', 20, yPos);
    yPos += 8;
    
    const completedLevels = data.evaluations?.filter((p: any) => p.totalScore !== undefined) || [];
    if (completedLevels.length > 0) {
      const avgPromptScore = Math.round(
        completedLevels.reduce((sum: number, p: any) => sum + (p.totalScore || 0), 0) / completedLevels.length
      );
      const performance = getPerformanceLevel(avgPromptScore);
      
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
      pdf.text(`${avgPromptScore}/100`, pageWidth / 2, yPos + 11, { align: 'center' });
      
      pdf.setFontSize(5);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`${completedLevels.length} level(s) completed`, pageWidth / 2, yPos + 15, { align: 'center' });
      
      yPos += 28;
    }
    
    pdf.setTextColor(0, 0, 0);
    
    if (data.evaluations && data.evaluations.length > 0) {
      const barHeight = 4;
      const barSpacing = 8;
      const barWidth = pageWidth - 100;
      
      data.evaluations.forEach((evaluation: any) => {
        if (yPos + barSpacing > pageHeight - 25) {
          pdf.addPage();
          addHeader(pdf, pageWidth);
          yPos = 35;
        }
        
        const level = evaluation.level || 1;
        const levelScore = evaluation.totalScore || 0;
        
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`Level ${level}`, 20, yPos + 4.5);
        
        pdf.setFillColor(243, 244, 246);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(50, yPos, barWidth, barHeight, 1, 1, 'FD');
        
        if (levelScore > 0) {
          const levelColor = getPromptLevelColor(level);
          const fillWidth = (levelScore / 100) * barWidth;
          
          pdf.setFillColor(levelColor[0], levelColor[1], levelColor[2]);
          if (fillWidth > 0) {
            pdf.roundedRect(50, yPos, fillWidth, barHeight, 1, 1, 'F');
          }
          
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
          pdf.text(`${levelScore}`, 50 + barWidth + 5, yPos + 4.5);
          
          pdf.setFontSize(6);
          pdf.setTextColor(107, 114, 128);
          pdf.text('/100', 50 + barWidth + 12, yPos + 4.5);
        } else {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(156, 163, 175);
          pdf.text('Not completed', 50 + barWidth / 2, yPos + 8, { align: 'center' });
        }
        
        yPos += barSpacing;
      });
    }
    
    const assessedDimensionsHeight = 25;
    if (yPos + assessedDimensionsHeight > pageHeight - 20) {
      pdf.addPage();
      addHeader(pdf, pageWidth);
      yPos = 35;
    }
    
    yPos += 8;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Assessed Dimensions:', 20, yPos);
    yPos += 5;
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    pdf.text('Clarity (20%) • Structure (20%) • Context Relevance (20%) • Creativity (20%) • Iterative Improvement (20%)', 20, yPos);
    yPos += 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Directly correlates with AI productivity. Skilled prompt engineers extract 3-5x more value from AI tools,', 52, yPos);
    yPos += 4;
    pdf.text('solve complex problems faster, and produce higher-quality AI-assisted outputs.', 20, yPos);
    yPos += 10;
    
  } else if (assessmentLower === 'aiq') {
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos - 5, pageWidth);
    yPos += 2;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring', 52, yPos);
    yPos += 4;
    pdf.text('(0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).', 20, yPos);
    yPos += 8;
    
    const aiqBand = getAIQBandInterpretation(overallScore);
    const aiqBandColor = getAIQBandColor(overallScore);
    
    const boxWidth = 56;
    const boxHeight = 18;
    const boxX = (pageWidth - boxWidth) / 2;
    
    const bgTint: [number, number, number] = [
      Math.round(255 - (255 - aiqBandColor[0]) * 0.15),
      Math.round(255 - (255 - aiqBandColor[1]) * 0.15),
      Math.round(255 - (255 - aiqBandColor[2]) * 0.15)
    ];
    pdf.setFillColor(bgTint[0], bgTint[1], bgTint[2]);
    pdf.setDrawColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(boxX, yPos, boxWidth, boxHeight, 2, 2, 'FD');
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.text(`${overallScore}%`, pageWidth / 2, yPos + 7, { align: 'center' });
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text(aiqBand.title, pageWidth / 2, yPos + 14, { align: 'center' });
    
    yPos += boxHeight + 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(55, 65, 81);
    const descLines = pdf.splitTextToSize(aiqBand.description, pageWidth - 50);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, pageWidth / 2, yPos + (idx * 4), { align: 'center' });
    });
    yPos += descLines.length * 4 + 6;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives', 52, yPos);
    yPos += 4;
    pdf.text('with operational realities, making them valuable for AI governance and deployment oversight roles.', 20, yPos);
    yPos += 10;
  }
  
  pdf.setTextColor(0, 0, 0);
  
  pdf.addPage();
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  yPos = 45;
  
  const roleRecs = generateRoleRecommendations(assessmentLower, overallScore);
  
  yPos = addSectionHeader(pdf, 'FINAL CANDIDATE RECOMMENDATIONS', yPos, pageWidth);
  yPos += 5;
  
  const recMargin = 25;
  const recContentWidth = pageWidth - recMargin * 2;
  const recLineHeight = 4;
  
  const drawRecSection = (
    title: string,
    items: string[],
    titleColor: [number, number, number]
  ): void => {
    if (yPos > pageHeight - 40) {
      pdf.addPage();
      addBackgroundPattern(pdf, pageWidth, pageHeight);
      addHeader(pdf, pageWidth);
      yPos = 45;
    }
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
    pdf.text(title, recMargin, yPos);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(55, 65, 81);
    
    items.forEach(item => {
      const lines = pdf.splitTextToSize(`• ${item}`, recContentWidth);
      lines.forEach((line: string) => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          addBackgroundPattern(pdf, pageWidth, pageHeight);
          addHeader(pdf, pageWidth);
          yPos = 45;
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(titleColor[0], titleColor[1], titleColor[2]);
          pdf.text(`${title} (continued)`, recMargin, yPos);
          yPos += 5;
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(55, 65, 81);
        }
        pdf.text(line, recMargin + 3, yPos);
        yPos += recLineHeight;
      });
      yPos += 1;
    });
    
    yPos += 6;
  };
  
  const sortedSkills = Object.entries(data.scores).sort((a, b) => a[1] - b[1]);
  const weakestSkills = sortedSkills.slice(0, 2);
  const developmentItems: string[] = [];
  
  weakestSkills.forEach(([skill, score]) => {
    if (score < 50) {
      developmentItems.push(`Priority development in ${skill} through targeted training and practical exercises.`);
    } else if (score < 70) {
      developmentItems.push(`Strengthen ${skill} skills through hands-on projects and peer collaboration.`);
    } else {
      developmentItems.push(`Refine ${skill} expertise with advanced certifications or specialized workshops.`);
    }
  });
  
  if (overallScore < 50) {
    developmentItems.push('Consider structured AI literacy programs to build foundational competencies.');
  } else if (overallScore < 70) {
    developmentItems.push('Seek mentorship opportunities to accelerate growth in identified development areas.');
  } else {
    developmentItems.push('Pursue leadership training to translate technical strengths into team impact.');
  }
  
  drawRecSection('MOST SUITABLE ROLES', roleRecs.suitableRoles, [30, 58, 138]);
  drawRecSection('WHERE THIS CANDIDATE WOULD THRIVE', roleRecs.thrivingEnvironments, [16, 185, 129]);
  drawRecSection('ROLE STRENGTHS', roleRecs.roleStrengths, [139, 92, 246]);
  drawRecSection('DEVELOPMENT RECOMMENDATIONS', developmentItems, [234, 88, 12]);
  
  pdf.setTextColor(0, 0, 0);
  
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight, true);
  }
  
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
