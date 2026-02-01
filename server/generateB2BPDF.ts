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

function ensurePageSpace(pdf: jsPDF, yPos: number, requiredHeight: number, pageHeight: number, pageWidth: number): number {
  if (yPos + requiredHeight > pageHeight - 20) {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    return 45;
  }
  return yPos;
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

interface AnalysisResult {
  overall: string;
  strengths: string[];
  improvements: string[];
}

function generateAnalysis(assessmentType: string, scores: Record<string, number>, totalScore?: number): AnalysisResult {
  const sortedSkills = Object.entries(scores).sort((a, b) => (b[1] as number) - (a[1] as number));
  const strengths = sortedSkills.filter(([_, score]) => (score as number) >= 70);
  const improvements = sortedSkills.filter(([_, score]) => (score as number) < 70);
  
  const analysis: AnalysisResult = {
    strengths: [],
    improvements: [],
    overall: "",
  };

  const assessmentLower = assessmentType.toLowerCase().replace('-', '_');

  switch (assessmentLower) {
    case "fit":
      analysis.overall = "This FIT assessment evaluates core behavioral competencies essential for workplace success and team collaboration.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          if (skill === "High Agency" || skill === "highAgency") {
            analysis.strengths.push(`High Agency (${score}/100): Takes initiative and ownership of outcomes, drives results independently.`);
          } else if (skill === "Intellectual Curiosity" || skill === "intellectualCuriosity") {
            analysis.strengths.push(`Intellectual Curiosity (${score}/100): Shows eagerness to learn and seeks to understand complex concepts.`);
          } else if (skill === "Resilience" || skill === "resilience") {
            analysis.strengths.push(`Resilience (${score}/100): Adapts well to challenges and maintains composure under pressure.`);
          } else if (skill === "Empathy & Ethics" || skill === "empathyEthics") {
            analysis.strengths.push(`Empathy & Ethics (${score}/100): Considers impact on others and makes ethical decisions.`);
          } else if (skill === "Growth Mindset" || skill === "growthMindset") {
            analysis.strengths.push(`Growth Mindset (${score}/100): Views challenges as learning opportunities and embraces feedback.`);
          } else if (skill === "Interpersonal Agility" || skill === "interpersonalAgility") {
            analysis.strengths.push(`Interpersonal Agility (${score}/100): Builds relationships effectively and adapts communication style.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          if (skill === "High Agency" || skill === "highAgency") {
            analysis.improvements.push(`High Agency (${score}/100): Could benefit from developing greater ownership and initiative.`);
          } else if (skill === "Intellectual Curiosity" || skill === "intellectualCuriosity") {
            analysis.improvements.push(`Intellectual Curiosity (${score}/100): Encourage deeper exploration and proactive learning.`);
          } else if (skill === "Resilience" || skill === "resilience") {
            analysis.improvements.push(`Resilience (${score}/100): Focus on stress management and reframing setbacks as learning.`);
          } else if (skill === "Empathy & Ethics" || skill === "empathyEthics") {
            analysis.improvements.push(`Empathy & Ethics (${score}/100): Develop stronger perspective-taking and ethical reasoning.`);
          } else if (skill === "Growth Mindset" || skill === "growthMindset") {
            analysis.improvements.push(`Growth Mindset (${score}/100): Work on viewing challenges positively and seeking feedback.`);
          } else if (skill === "Interpersonal Agility" || skill === "interpersonalAgility") {
            analysis.improvements.push(`Interpersonal Agility (${score}/100): Practice adapting communication to diverse audiences.`);
          }
        });
      }
      break;

    case "ai_readiness":
    case "aireadiness":
      analysis.overall = "This AI Readiness assessment measures capabilities critical for effective collaboration with AI systems and thriving in AI-augmented environments.";
      
      if (strengths.length > 0) {
        strengths.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting") || skillLower.includes("prompt")) {
            analysis.strengths.push(`AI Literacy & Prompt Engineering (${score}/100): Understands AI capabilities and crafts effective prompts.`);
          } else if (skillLower.includes("technical")) {
            analysis.strengths.push(`Technical Fundamentals (${score}/100): Comfortable with technical concepts and AI tools.`);
          } else if (skillLower.includes("data")) {
            analysis.strengths.push(`Data Fluency (${score}/100): Strong ability to work with and interpret data effectively.`);
          } else if (skillLower.includes("critical")) {
            analysis.strengths.push(`Critical Thinking (${score}/100): Evaluates AI outputs critically and identifies limitations.`);
          } else if (skillLower.includes("adaptive") || skillLower.includes("continuous") || skillLower.includes("adaptability")) {
            analysis.strengths.push(`Adaptability & Continuous Learning (${score}/100): Quickly adapts to new AI tools.`);
          } else if (skillLower.includes("responsible") || skillLower.includes("ethical")) {
            analysis.strengths.push(`Responsible AI (${score}/100): Uses AI ethically and understands implications.`);
          } else if (skillLower.includes("creative") || skillLower.includes("innovation")) {
            analysis.strengths.push(`Creativity & Innovation (${score}/100): Leverages AI for creative problem-solving.`);
          } else if (skillLower.includes("collaboration") || skillLower.includes("communication")) {
            analysis.strengths.push(`Collaboration & Communication (${score}/100): Collaborates effectively in AI projects.`);
          } else if (skillLower.includes("domain")) {
            analysis.strengths.push(`Domain Expertise (${score}/100): Deep specialized knowledge in specific field.`);
          }
        });
      }
      
      if (improvements.length > 0) {
        improvements.forEach(([skill, score]) => {
          const skillLower = skill.toLowerCase();
          if (skillLower.includes("literacy") || skillLower.includes("prompting") || skillLower.includes("prompt")) {
            analysis.improvements.push(`AI Literacy & Prompt Engineering (${score}/100): Focus on AI fundamentals and prompt training.`);
          } else if (skillLower.includes("technical")) {
            analysis.improvements.push(`Technical Fundamentals (${score}/100): Build technical foundation with hands-on practice.`);
          } else if (skillLower.includes("data")) {
            analysis.improvements.push(`Data Fluency (${score}/100): Develop skills in data interpretation and analysis.`);
          } else if (skillLower.includes("critical")) {
            analysis.improvements.push(`Critical Thinking (${score}/100): Practice evaluating AI outputs and recognizing biases.`);
          } else if (skillLower.includes("responsible") || skillLower.includes("ethical")) {
            analysis.improvements.push(`Responsible AI (${score}/100): Focus on AI ethics training and responsible practices.`);
          } else {
            analysis.improvements.push(`${skill} (${score}/100): This area would benefit from targeted development.`);
          }
        });
      }
      break;

    case "prompt_architecture":
      analysis.overall = `This Prompt Architecture assessment evaluates prompt design skills across progressive difficulty levels. Overall score: ${totalScore}/100. Prompts are evaluated on five equal dimensions (20% each): Clarity, Structure, Context Relevance, Creativity, and Iterative Improvement.`;
      
      if (totalScore !== undefined) {
        if (totalScore >= 80) {
          analysis.strengths.push(`Exceptional prompt design skills: Demonstrates mastery in crafting clear, well-structured prompts.`);
          analysis.strengths.push(`Advanced understanding: Handles complex scenarios and guides AI systems effectively.`);
        } else if (totalScore >= 65) {
          analysis.strengths.push(`Solid prompt engineering foundation: Creates effective prompts with good structure and clarity.`);
          analysis.strengths.push(`Good contextual awareness: Understands how to provide relevant context to AI systems.`);
        } else if (totalScore >= 50) {
          analysis.strengths.push(`Basic prompt design capabilities: Shows fundamental understanding of AI communication.`);
        }
        
        if (totalScore < 80) {
          if (totalScore < 50) {
            analysis.improvements.push(`Prompt structure and clarity: Focus on writing more specific, clear prompts.`);
            analysis.improvements.push(`Context provision: Practice including relevant background information.`);
          } else if (totalScore < 65) {
            analysis.improvements.push(`Advanced techniques: Explore iterative refinement strategies.`);
            analysis.improvements.push(`Creativity: Experiment with creative problem-solving approaches.`);
          } else {
            analysis.improvements.push(`Fine-tuning: Continue refining techniques for edge cases.`);
          }
        }
      }
      break;

    case "aiq":
      const aiqScore = totalScore || Object.values(scores)[0] || 0;
      const bandInterpretation = getAIQBandInterpretation(aiqScore);
      
      analysis.overall = `This Algorithmic Integrity Quotient (AIQ) assessment evaluates ethical reasoning in AI scenarios. Score: ${aiqScore}/100 - ${bandInterpretation.title} (${bandInterpretation.band}). ${bandInterpretation.description}`;
      
      if (aiqScore >= 80) {
        analysis.strengths.push(`Exceptional ethical alignment: Consistently prioritizes optimal ethical outcomes.`);
        analysis.strengths.push(`Strategic ethical leadership: Navigates complex situations while maintaining principles.`);
        analysis.strengths.push(`AI governance ready: Well-prepared for ethical oversight roles.`);
      } else if (aiqScore >= 60) {
        analysis.strengths.push(`Strong ethical foundation: Shows sound judgment balancing ethics with operations.`);
        analysis.strengths.push(`Practical ethics awareness: Understands responsible AI deployment.`);
        if (aiqScore < 80) {
          analysis.improvements.push(`Advanced ethical reasoning: Explore more complex ethical frameworks.`);
        }
      } else if (aiqScore >= 40) {
        analysis.strengths.push(`Basic ethical awareness: Shows foundational understanding of AI ethics.`);
        analysis.improvements.push(`Ethical prioritization: Practice weighing ethical considerations more heavily.`);
        analysis.improvements.push(`Bias recognition: Develop skills in identifying algorithmic bias.`);
      } else {
        analysis.improvements.push(`AI ethics fundamentals: Recommend training on fairness and accountability.`);
        analysis.improvements.push(`Consent and privacy: Study best practices for sensitive data handling.`);
        analysis.improvements.push(`Responsible deployment: Learn risk assessment for AI systems.`);
        analysis.improvements.push(`Regulatory awareness: Familiarize with AI governance frameworks.`);
      }
      break;
  }
  
  return analysis;
}

function addComprehensiveAnalysisSection(
  pdf: jsPDF, 
  analysis: AnalysisResult, 
  yPos: number, 
  pageWidth: number, 
  pageHeight: number
): number {
  yPos = ensurePageSpace(pdf, yPos, 80, pageHeight, pageWidth);
  
  yPos = addSectionHeader(pdf, 'COMPREHENSIVE ANALYSIS', yPos, pageWidth);
  yPos += 3;
  
  pdf.setFillColor(249, 250, 251);
  pdf.roundedRect(20, yPos, pageWidth - 40, 18, 2, 2, 'F');
  
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  const overallLines = pdf.splitTextToSize(analysis.overall, pageWidth - 50);
  overallLines.forEach((line: string, idx: number) => {
    pdf.text(line, 25, yPos + 5 + (idx * 4));
  });
  yPos += Math.max(18, overallLines.length * 4 + 8);
  yPos += 6;
  
  if (analysis.strengths.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 40, pageHeight, pageWidth);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Key Strengths', 20, yPos);
    yPos += 6;
    
    analysis.strengths.forEach((strength, idx) => {
      yPos = ensurePageSpace(pdf, yPos, 12, pageHeight, pageWidth);
      
      pdf.setFillColor(239, 246, 255);
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(20, yPos - 2, pageWidth - 40, 10, 1, 1, 'FD');
      pdf.setLineWidth(0.2);
      
      pdf.setDrawColor(59, 130, 246);
      pdf.setFillColor(59, 130, 246);
      pdf.rect(20, yPos - 2, 2, 10, 'F');
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      const strengthText = strength.length > 110 ? strength.substring(0, 107) + '...' : strength;
      pdf.text(strengthText, 26, yPos + 4);
      
      yPos += 12;
    });
    yPos += 4;
  }
  
  if (analysis.improvements.length > 0) {
    yPos = ensurePageSpace(pdf, yPos, 40, pageHeight, pageWidth);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(245, 158, 11);
    pdf.text('Development Opportunities', 20, yPos);
    yPos += 6;
    
    analysis.improvements.forEach((improvement, idx) => {
      yPos = ensurePageSpace(pdf, yPos, 12, pageHeight, pageWidth);
      
      pdf.setFillColor(255, 251, 235);
      pdf.setDrawColor(245, 158, 11);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(20, yPos - 2, pageWidth - 40, 10, 1, 1, 'FD');
      pdf.setLineWidth(0.2);
      
      pdf.setDrawColor(245, 158, 11);
      pdf.setFillColor(245, 158, 11);
      pdf.rect(20, yPos - 2, 2, 10, 'F');
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      const improvementText = improvement.length > 110 ? improvement.substring(0, 107) + '...' : improvement;
      pdf.text(improvementText, 26, yPos + 4);
      
      yPos += 12;
    });
    yPos += 4;
  }
  
  return yPos;
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
  pdf.text(`Assessment for: ${data.partnerCompanyName}`, leftMargin + totalBoxWidth / 2, yPos + 28, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  yPos = 155;
  
  const overallScore = data.totalScore || Math.round(Object.values(data.scores).reduce((a, b) => a + b, 0) / Math.max(Object.values(data.scores).length, 1));
  const perf = getPerformanceLevel(overallScore);
  
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.setLineWidth(1.5);
  pdf.roundedRect(50, yPos, pageWidth - 100, 45, 3, 3, 'FD');
  pdf.setLineWidth(0.2);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text('OVERALL SCORE', pageWidth / 2, yPos + 10, { align: 'center' });
  
  pdf.setFontSize(32);
  pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
  pdf.text(`${overallScore}`, pageWidth / 2 - 12, yPos + 28, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.text('/100', pageWidth / 2 + 15, yPos + 28, { align: 'left' });
  
  pdf.setFontSize(10);
  pdf.text(perf.label, pageWidth / 2, yPos + 38, { align: 'center' });
  
  if (data.percentile) {
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Top ${100 - data.percentile}% of all test-takers`, pageWidth / 2, yPos + 45, { align: 'center' });
    yPos = 210;
  } else {
    yPos = 208;
  }
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(75, 85, 99);
  pdf.text(`Assessment Type: ${assessmentName}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 6;
  pdf.text(`Completed: ${new Date(data.completedAt).toLocaleDateString()}`, pageWidth / 2, yPos, { align: 'center' });
  
  if (assessmentLower === 'fit') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'FIT ASSESSMENT - BEHAVIORAL SKILLS', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Six core behavioural skills: High Agency, Intellectual Curiosity, Resilience, Empathy & Ethics,', 52, yPos);
    yPos += 4;
    pdf.text('Growth Mindset, and Interpersonal Agility.', 20, yPos);
    yPos += 10;
    
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
    pdf.text('Predicts cultural fit and team dynamics. High scorers bring initiative, adaptability, and strong', 52, yPos);
    yPos += 4;
    pdf.text('interpersonal skills. Resilient individuals navigate challenges effectively while maintaining relationships.', 20, yPos);
    
    const fitAnalysis = generateAnalysis('fit', data.scores, overallScore);
    yPos = addComprehensiveAnalysisSection(pdf, fitAnalysis, yPos + 10, pageWidth, pageHeight);
    
  } else if (assessmentLower === 'ai_readiness' || assessmentLower === 'aireadiness') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'AI READINESS ASSESSMENT', yPos, pageWidth);
    yPos += 5;
    
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
    yPos += 10;
    
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
    
    const aiAnalysis = generateAnalysis('ai_readiness', data.scores, overallScore);
    yPos = addComprehensiveAnalysisSection(pdf, aiAnalysis, yPos + 10, pageWidth, pageHeight);
    
  } else if (assessmentLower === 'prompt_architecture') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'PROMPT ARCHITECTURE ASSESSMENT', yPos, pageWidth);
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
    yPos += 12;
    
    const promptBoxWidth = 70;
    const promptBoxX = (pageWidth - promptBoxWidth) / 2;
    
    pdf.setFillColor(249, 250, 251);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(promptBoxX, yPos, promptBoxWidth, 20, 2, 2, 'FD');
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Overall Prompt Engineering Score', pageWidth / 2, yPos + 6, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(perf.color[0], perf.color[1], perf.color[2]);
    pdf.text(`${overallScore}/100`, pageWidth / 2, yPos + 14, { align: 'center' });
    
    yPos += 30;
    
    if (data.evaluations && data.evaluations.length > 0) {
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(75, 85, 99);
      pdf.text('Level Breakdown:', 20, yPos);
      yPos += 8;
      
      const barHeight = 5;
      const barSpacing = 10;
      const barWidth = pageWidth - 100;
      
      data.evaluations.forEach((evaluation: any) => {
        yPos = ensurePageSpace(pdf, yPos, barSpacing, pageHeight, pageWidth);
        
        const level = evaluation.level || 1;
        const levelScore = evaluation.totalScore || 0;
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(75, 85, 99);
        pdf.text(`Level ${level}`, 20, yPos + 4);
        
        pdf.setFillColor(243, 244, 246);
        pdf.setDrawColor(229, 231, 235);
        pdf.roundedRect(50, yPos, barWidth, barHeight, 1, 1, 'FD');
        
        const levelColor = getBlueShadeColor(levelScore);
        const fillWidth = (levelScore / 100) * barWidth;
        
        pdf.setFillColor(levelColor[0], levelColor[1], levelColor[2]);
        if (fillWidth > 0) {
          pdf.roundedRect(50, yPos, fillWidth, barHeight, 1, 1, 'F');
        }
        
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(levelColor[0], levelColor[1], levelColor[2]);
        pdf.text(`${levelScore}`, 50 + barWidth + 5, yPos + 4);
        
        pdf.setFontSize(6);
        pdf.setTextColor(107, 114, 128);
        pdf.text('/100', 50 + barWidth + 14, yPos + 4);
        
        yPos += barSpacing;
      });
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
    yPos += 8;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Directly correlates with AI productivity. Skilled prompt engineers extract 3-5x more value from AI tools,', 52, yPos);
    yPos += 4;
    pdf.text('solve complex problems faster, and produce higher-quality AI-assisted outputs.', 20, yPos);
    
    const promptAnalysis = generateAnalysis('prompt_architecture', data.scores, overallScore);
    yPos = addComprehensiveAnalysisSection(pdf, promptAnalysis, yPos + 10, pageWidth, pageHeight);
    
  } else if (assessmentLower === 'aiq') {
    pdf.addPage();
    addBackgroundPattern(pdf, pageWidth, pageHeight);
    addHeader(pdf, pageWidth);
    yPos = 38;
    
    yPos = addSectionHeader(pdf, 'ALGORITHMIC INTEGRITY QUOTIENT (AIQ)', yPos, pageWidth);
    yPos += 5;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('What It Measures:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('AI ethics, bias detection, fairness, transparency, and responsible deployment using graded scoring', 52, yPos);
    yPos += 4;
    pdf.text('(0-100%). Options weighted by ethical alignment: Best (100%), Acceptable (65-75%), Suboptimal (30-50%), Poor (0-25%).', 20, yPos);
    yPos += 12;
    
    const aiqBand = getAIQBandInterpretation(overallScore);
    const aiqBandColor = getAIQBandColor(overallScore);
    
    const boxWidth = 60;
    const boxHeight = 22;
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
    
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(aiqBandColor[0], aiqBandColor[1], aiqBandColor[2]);
    pdf.text(`${overallScore}%`, pageWidth / 2, yPos + 9, { align: 'center' });
    
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(aiqBand.title, pageWidth / 2, yPos + 17, { align: 'center' });
    
    yPos += boxHeight + 8;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(55, 65, 81);
    const descLines = pdf.splitTextToSize(aiqBand.description, pageWidth - 50);
    descLines.forEach((line: string, idx: number) => {
      pdf.text(line, pageWidth / 2, yPos + (idx * 4), { align: 'center' });
    });
    yPos += descLines.length * 4 + 10;
    
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(59, 130, 246);
    pdf.text('Workplace Impact:', 20, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(75, 85, 99);
    pdf.text('Graded scoring captures nuanced ethical judgment. Identifies candidates who balance ethical imperatives', 52, yPos);
    yPos += 4;
    pdf.text('with operational realities, making them valuable for AI governance and deployment oversight roles.', 20, yPos);
    
    const aiqAnalysis = generateAnalysis('aiq', data.scores, overallScore);
    yPos = addComprehensiveAnalysisSection(pdf, aiqAnalysis, yPos + 10, pageWidth, pageHeight);
  }
  
  addSkillsLegendPage(pdf, pageWidth, pageHeight);
  
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    addFooter(pdf, i, totalPages, pageWidth, pageHeight, true);
  }
  
  const pdfOutput = pdf.output('arraybuffer');
  return Buffer.from(pdfOutput);
}
