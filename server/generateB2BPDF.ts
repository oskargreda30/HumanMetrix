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
  { key: 'High Agency', displayName: 'High Agency', description: 'Takes initiative and ownership of outcomes' },
  { key: 'Intellectual Curiosity', displayName: 'Intellectual Curiosity', description: 'Seeks knowledge and understanding' },
  { key: 'Resilience', displayName: 'Resilience', description: 'Adapts and perseveres through challenges' },
  { key: 'Empathy & Ethics', displayName: 'Empathy & Ethics', description: 'Considers impact on others and ethical implications' },
  { key: 'Growth Mindset', displayName: 'Growth Mindset', description: 'Views challenges as learning opportunities' },
  { key: 'Interpersonal Agility', displayName: 'Interpersonal Agility', description: 'Navigates social dynamics effectively' },
];

const AI_READINESS_SKILLS = [
  { key: 'AI Literacy & Prompt Engineering', displayName: 'AI Literacy & Prompt Engineering', description: 'Understanding AI capabilities and effective prompt engineering' },
  { key: 'Technical Fundamentals', displayName: 'Technical Fundamentals', description: 'Core technical knowledge and system understanding' },
  { key: 'Data Fluency', displayName: 'Data Fluency', description: 'Ability to work with and interpret data effectively' },
  { key: 'Critical Thinking & Problem-Solving', displayName: 'Critical Thinking & Problem-Solving', description: 'Analytical reasoning and solution development' },
  { key: 'Adaptability & Continuous Learning', displayName: 'Adaptability & Continuous Learning', description: 'Embracing change and ongoing skill development' },
  { key: 'Collaboration & Communication', displayName: 'Collaboration & Communication', description: 'Effective teamwork and information sharing' },
  { key: 'Responsible AI & Ethical Awareness', displayName: 'Responsible AI & Ethical Awareness', description: 'Ethical AI practices and responsible deployment' },
  { key: 'Creativity & Innovation', displayName: 'Creativity & Innovation', description: 'Generating novel ideas and innovative solutions' },
  { key: 'Domain Expertise', displayName: 'Domain Expertise', description: 'Deep specialized knowledge in specific field' },
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
  
  if (pageNum < totalPages) {
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
  
  const descColumnX = 85;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(59, 130, 246);
  pdf.text('FIT Assessment - Behavioral Skills', 20, yPos);
  yPos += 6;
  
  pdf.setFontSize(8);
  pdf.setTextColor(55, 65, 81);
  
  FIT_SKILLS.forEach((skill) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${skill.displayName}:`, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(skill.description || '', descColumnX, yPos);
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
    pdf.text(`${skill.displayName}:`, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    const descWidth = pageWidth - descColumnX - 15;
    const descLines = pdf.splitTextToSize(skill.description || '', descWidth);
    pdf.text(descLines[0], descColumnX, yPos);
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
    pdf.text(`${dim.displayName}:`, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(dim.description, descColumnX, yPos);
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
    pdf.text(`${band.range} (${band.title}):`, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(band.description, descColumnX, yPos);
    yPos += 5;
  });
  
  pdf.setTextColor(0, 0, 0);
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
  
  let yPos = 30;
  
  addBackgroundPattern(pdf, pageWidth, pageHeight);
  addHeader(pdf, pageWidth);
  
  yPos = 38;
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
  pdf.roundedRect(50, yPos, pageWidth - 100, 45, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('OVERALL SCORE', pageWidth / 2, yPos + 12, { align: 'center' });
  
  pdf.setFontSize(32);
  pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.text(`${overallScore}`, pageWidth / 2 - 15, yPos + 32, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('/100', pageWidth / 2 + 15, yPos + 32, { align: 'left' });
  
  pdf.setFontSize(10);
  pdf.text(perf.label, pageWidth / 2, yPos + 40, { align: 'center' });
  
  if (data.percentile) {
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Top ${100 - data.percentile}% of all test-takers`, pageWidth / 2, yPos + 48, { align: 'center' });
  }
  
  pdf.setTextColor(0, 0, 0);
  yPos = 180;
  
  const assessmentLower = data.assessmentType.toLowerCase().replace('-', '_');
  
  if (assessmentLower === 'fit') {
    yPos = addSectionHeader(pdf, 'SKILL SCORES - BEHAVIORAL COMPETENCIES', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your performance across the six core behavioral skills:', 20, yPos);
    yPos += 10;
    
    FIT_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 15, pageHeight, pageWidth);
      
      const score = data.scores[skill.key] || 0;
      const skillPerf = getPerformanceLevel(score);
      
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      pdf.setFont('helvetica', 'normal');
      pdf.text(skill.displayName, 25, yPos + 4);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(skillPerf.color[0], skillPerf.color[1], skillPerf.color[2]);
      pdf.text(`${score}`, pageWidth - 30, yPos + 4, { align: 'right' });
      
      const barWidth = 60;
      const barX = pageWidth - 95;
      pdf.setFillColor(229, 231, 235);
      pdf.rect(barX, yPos, barWidth, 6, 'F');
      pdf.setFillColor(skillPerf.color[0], skillPerf.color[1], skillPerf.color[2]);
      pdf.rect(barX, yPos, (barWidth * score) / 100, 6, 'F');
      
      yPos += 14;
    });
    
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    yPos = addSectionHeader(pdf, 'SKILL SCORES - AI COMPETENCIES', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your performance across the nine AI readiness skills:', 20, yPos);
    yPos += 10;
    
    AI_READINESS_SKILLS.forEach((skill) => {
      yPos = ensurePageSpace(pdf, yPos, 15, pageHeight, pageWidth);
      
      const score = data.scores[skill.key] || 0;
      const skillPerf = getPerformanceLevel(score);
      
      pdf.setFillColor(249, 250, 251);
      pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
      
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      pdf.setFont('helvetica', 'normal');
      
      const shortName = skill.displayName.length > 30 ? skill.displayName.substring(0, 28) + '...' : skill.displayName;
      pdf.text(shortName, 25, yPos + 4);
      
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(skillPerf.color[0], skillPerf.color[1], skillPerf.color[2]);
      pdf.text(`${score}`, pageWidth - 30, yPos + 4, { align: 'right' });
      
      const barWidth = 60;
      const barX = pageWidth - 95;
      pdf.setFillColor(229, 231, 235);
      pdf.rect(barX, yPos, barWidth, 6, 'F');
      pdf.setFillColor(skillPerf.color[0], skillPerf.color[1], skillPerf.color[2]);
      pdf.rect(barX, yPos, (barWidth * score) / 100, 6, 'F');
      
      yPos += 14;
    });
    
  } else if (assessmentLower === 'prompt_architecture') {
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE RESULTS', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Your prompt engineering skills assessed across multiple difficulty levels:', 20, yPos);
    yPos += 15;
    
    if (data.evaluations && data.evaluations.length > 0) {
      data.evaluations.forEach((level: any, idx: number) => {
        yPos = ensurePageSpace(pdf, yPos, 50, pageHeight, pageWidth);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(59, 130, 246);
        pdf.text(`Level ${level.level || idx + 1}`, 25, yPos);
        
        const levelScore = level.totalScore || 0;
        const levelPerf = getPerformanceLevel(levelScore);
        pdf.setTextColor(levelPerf.color[0], levelPerf.color[1], levelPerf.color[2]);
        pdf.text(`Score: ${levelScore}/100`, pageWidth - 30, yPos, { align: 'right' });
        yPos += 8;
        
        if (level.scores) {
          Object.entries(level.scores).forEach(([dimension, score]) => {
            pdf.setFontSize(8);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(75, 85, 99);
            const dimName = dimension.replace(/([A-Z])/g, ' $1').trim();
            pdf.text(`• ${dimName}: ${score}/20`, 30, yPos);
            yPos += 5;
          });
        }
        
        if (level.feedback) {
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'italic');
          pdf.setTextColor(107, 114, 128);
          const feedbackLines = pdf.splitTextToSize(`"${level.feedback}"`, pageWidth - 60);
          feedbackLines.slice(0, 3).forEach((line: string) => {
            pdf.text(line, 30, yPos);
            yPos += 4;
          });
        }
        
        yPos += 8;
      });
    }
    
  } else if (assessmentLower === 'aiq') {
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
    pdf.setLineWidth(1);
    pdf.roundedRect(30, yPos, pageWidth - 60, 55, 3, 3, 'FD');
    pdf.setLineWidth(0.2);
    
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(147, 51, 234);
    pdf.text(`${aiqInterpretation.title} (${aiqInterpretation.band})`, pageWidth / 2, yPos + 12, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    const interpretationLines = pdf.splitTextToSize(aiqInterpretation.interpretation, pageWidth - 80);
    let lineY = yPos + 25;
    interpretationLines.forEach((line: string) => {
      pdf.text(line, pageWidth / 2, lineY, { align: 'center' });
      lineY += 5;
    });
    
    yPos += 65;
    
    if (data.scores && Object.keys(data.scores).length > 1) {
      yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
      yPos = addSectionHeader(pdf, 'CATEGORY BREAKDOWN', yPos, pageWidth);
      yPos += 5;
      
      Object.entries(data.scores).forEach(([category, score]) => {
        if (category === 'Algorithmic Integrity') return;
        
        yPos = ensurePageSpace(pdf, yPos, 15, pageHeight, pageWidth);
        
        const catPerf = getPerformanceLevel(score);
        
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, yPos - 3, pageWidth - 40, 12, 'F');
        
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        pdf.setFont('helvetica', 'normal');
        pdf.text(category, 25, yPos + 4);
        
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(catPerf.color[0], catPerf.color[1], catPerf.color[2]);
        pdf.text(`${score}%`, pageWidth - 30, yPos + 4, { align: 'right' });
        
        yPos += 14;
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
