import jsPDF from 'jspdf';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { applyBodyText, applySmallText, applyLabelText, savePdfMobile } from './pdfStyles';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 35;
const MARGIN_BOTTOM = 25;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  primaryLight: [59, 130, 246] as [number, number, number],
  text: [17, 24, 39] as [number, number, number],
  textSecondary: [55, 65, 81] as [number, number, number],
  textMuted: [107, 114, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bgLight: [249, 250, 251] as [number, number, number],
  bgSection: [243, 244, 246] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
  greenLight: [220, 252, 231] as [number, number, number],
  amber: [217, 119, 6] as [number, number, number],
  amberLight: [254, 243, 199] as [number, number, number],
  red: [220, 38, 38] as [number, number, number],
  redLight: [254, 226, 226] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  blueLight: [219, 234, 254] as [number, number, number],
  purple: [147, 51, 234] as [number, number, number],
  cyan: [6, 182, 212] as [number, number, number],
  rose: [225, 29, 72] as [number, number, number],
};

const CAP_COLORS: Record<string, [number, number, number]> = {
  HA: [59, 130, 246],
  IC: [147, 51, 234],
  RA: [22, 163, 74],
  EE: [225, 29, 72],
  GM: [217, 119, 6],
  IA: [6, 182, 212],
};

const CAP_NAMES: Record<string, string> = {
  HA: "High Agency",
  IC: "Intellectual Curiosity",
  RA: "Resilience",
  EE: "Empathy & Ethics",
  GM: "Growth Mindset",
  IA: "Interpersonal Agility",
};

interface EcosystemPdfData {
  companyName: string;
  project: any;
  analysis: any;
  missionAnalysis: any;
  teamMembers: any[];
  cumulativeScores: Array<{
    capability: string;
    code: string;
    score: number;
    maxPossible: number;
  }>;
}

let totalPages = 1;

function addHeader(pdf: jsPDF) {
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, PAGE_WIDTH, 32, 'F');
  try {
    pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', -6, -4, 48, 48);
  } catch {}
  pdf.setTextColor(...COLORS.primary);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 34, 17);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.primaryLight);
  pdf.text('AI-Powered Assessment Platform', 34, 23);
  pdf.setTextColor(...COLORS.text);
}

function addFooter(pdf: jsPDF, pageNum: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_WIDTH - 15, PAGE_HEIGHT - 8, { align: 'right' });
  pdf.text('\u00A9 HumanMetrix', 15, PAGE_HEIGHT - 8);
  pdf.setTextColor(...COLORS.text);
}

function newPage(pdf: jsPDF): number {
  pdf.addPage();
  totalPages++;
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  addHeader(pdf);
  return MARGIN_TOP;
}

function ensureSpace(pdf: jsPDF, yPos: number, needed: number): number {
  if (yPos + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    return newPage(pdf);
  }
  return yPos;
}

function drawSectionTitle(pdf: jsPDF, title: string, yPos: number, icon?: string): number {
  yPos = ensureSpace(pdf, yPos, 20);
  pdf.setFillColor(...COLORS.bgSection);
  pdf.roundedRect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 12, 2, 2, 'F');
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.text);
  const xOffset = icon ? MARGIN_LEFT + 10 : MARGIN_LEFT + 5;
  if (icon) {
    pdf.setFontSize(9);
    pdf.text(icon, MARGIN_LEFT + 5, yPos + 8);
    pdf.setFontSize(11);
  }
  pdf.text(title, xOffset, yPos + 8);
  return yPos + 18;
}

function wrapText(pdf: jsPDF, text: string, maxWidth: number): string[] {
  return pdf.splitTextToSize(text, maxWidth);
}

function drawWrappedText(pdf: jsPDF, text: string, x: number, yPos: number, maxWidth: number, lineHeight: number = 4.5): number {
  const lines = wrapText(pdf, text, maxWidth);
  for (const line of lines) {
    yPos = ensureSpace(pdf, yPos, lineHeight + 2);
    pdf.text(line, x, yPos);
    yPos += lineHeight;
  }
  return yPos;
}

function drawKeyValuePair(pdf: jsPDF, label: string, value: string, yPos: number, maxWidth: number): number {
  applyLabelText(pdf);
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text(label.toUpperCase(), MARGIN_LEFT + 4, yPos);
  yPos += 4;
  applyBodyText(pdf);
  yPos = drawWrappedText(pdf, value, MARGIN_LEFT + 4, yPos, maxWidth - 8);
  return yPos + 2;
}

function drawCapabilityBadge(pdf: jsPDF, code: string, x: number, y: number, size: number = 6): void {
  const color = CAP_COLORS[code] || COLORS.textMuted;
  pdf.setFillColor(...color);
  pdf.roundedRect(x, y - size + 1, size, size, 1, 1, 'F');
  pdf.setFontSize(5);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.white);
  pdf.text(code, x + size / 2, y - size / 2 + 2.5, { align: 'center' });
  pdf.setTextColor(...COLORS.text);
}

function drawHorizontalBar(pdf: jsPDF, x: number, y: number, width: number, currentPct: number, targetPct: number, barColor: [number, number, number]): void {
  pdf.setFillColor(...COLORS.bgSection);
  pdf.roundedRect(x, y, width, 5, 2, 2, 'F');
  const currentWidth = Math.min(width * (currentPct / 100), width);
  if (currentWidth > 0) {
    pdf.setFillColor(...barColor);
    pdf.roundedRect(x, y, currentWidth, 5, 2, 2, 'F');
  }
  const targetX = x + Math.min(width * (targetPct / 100), width);
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.4);
  pdf.line(targetX, y - 1, targetX, y + 6);
  pdf.setLineWidth(0.2);
}

export async function generateEcosystemPdf(data: EcosystemPdfData): Promise<void> {
  const { companyName, project, analysis, missionAnalysis, teamMembers, cumulativeScores } = data;
  totalPages = 1;

  const pdf = new jsPDF('p', 'mm', 'a4');
  pdf.setFillColor(...COLORS.white);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
  addHeader(pdf);

  let y = MARGIN_TOP;

  // ====== COVER / TITLE SECTION ======
  y += 5;
  pdf.setFillColor(...COLORS.primaryLight);
  pdf.rect(0, y, PAGE_WIDTH, 28, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TEAM DIAGNOSTIC REPORT', PAGE_WIDTH / 2, y + 12, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `${companyName || 'Your Organization'} \u2022 ${analysis.teamSize} Team Members \u2022 ${new Date(analysis.generatedAt).toLocaleDateString()}`,
    PAGE_WIDTH / 2, y + 21,
    { align: 'center' }
  );
  pdf.setTextColor(...COLORS.text);
  y += 36;

  // Score badges
  const badgeWidth = 70;
  const badgeX1 = PAGE_WIDTH / 2 - badgeWidth - 5;
  const badgeX2 = PAGE_WIDTH / 2 + 5;
  
  pdf.setFillColor(...COLORS.blueLight);
  pdf.roundedRect(badgeX1, y, badgeWidth, 20, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('Mission Alignment', badgeX1 + badgeWidth / 2, y + 7, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const missionColor = analysis.missionAlignmentScore >= 70 ? COLORS.green : analysis.missionAlignmentScore >= 50 ? COLORS.amber : COLORS.red;
  pdf.setTextColor(...missionColor);
  pdf.text(`${analysis.missionAlignmentScore}%`, badgeX1 + badgeWidth / 2, y + 16, { align: 'center' });

  pdf.setFillColor(...COLORS.greenLight);
  pdf.roundedRect(badgeX2, y, badgeWidth, 20, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('Health Score', badgeX2 + badgeWidth / 2, y + 7, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const healthColor = analysis.overallHealthScore >= 70 ? COLORS.green : analysis.overallHealthScore >= 50 ? COLORS.amber : COLORS.red;
  pdf.setTextColor(...healthColor);
  pdf.text(`${analysis.overallHealthScore}%`, badgeX2 + badgeWidth / 2, y + 16, { align: 'center' });
  pdf.setTextColor(...COLORS.text);
  y += 28;

  // ====== HOW TO READ THIS REPORT ======
  y = drawSectionTitle(pdf, 'How to Read This Report', y);
  applySmallText(pdf);
  const guideItems = [
    ['Your Context', 'Summary of the mission, team details, and insights you provided during setup.'],
    ['Strategic Assessment', 'Executive summary analyzing your team\'s strengths, gaps, and strategic recommendations.'],
    ['Mission Alignment', 'How well your team\'s capabilities match what your mission requires for success.'],
    ['Health Score', 'Overall team capability coverage, balance, and risk exposure assessment.'],
    ['Gap Analysis', 'Visual comparison of current team capabilities vs. what your mission requires.'],
    ['Hiring Recommendations', 'Ideal candidate profiles with specific FIT score targets and interview guidance.'],
  ];
  const colWidth = CONTENT_WIDTH / 3;
  for (let row = 0; row < 2; row++) {
    y = ensureSpace(pdf, y, 16);
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const item = guideItems[idx];
      const cx = MARGIN_LEFT + col * colWidth + 2;
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(item[0], cx, y);
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textMuted);
      const descLines = wrapText(pdf, item[1], colWidth - 6);
      descLines.forEach((line, li) => {
        pdf.text(line, cx, y + 4 + li * 3.2);
      });
    }
    y += 16;
  }
  y += 4;

  // ====== YOUR CONTEXT ======
  y = drawSectionTitle(pdf, 'Your Context', y);
  const contextItems: [string, string][] = [];
  if (project.missionStatement) contextItems.push(['Mission Statement', project.missionStatement]);
  if (project.teamStage) contextItems.push(['Team Stage', project.teamStage.replace(/_/g, ' ')]);
  if (project.currentChallenges) contextItems.push(['Current Challenges', project.currentChallenges]);
  if (project.hiringPlans) contextItems.push(['Planned Hires', `${project.hiringPlans} new team members`]);

  for (const [label, value] of contextItems) {
    const estimatedHeight = Math.ceil(value.length / 60) * 4.5 + 8;
    y = ensureSpace(pdf, y, estimatedHeight);
    y = drawKeyValuePair(pdf, label, value, y, CONTENT_WIDTH);
    y += 2;
  }

  // Deep dive insights
  const deepDiveFields: [string, string | null | undefined][] = [
    ['Delayed Tasks', project.delayedTasks],
    ['Conflict Topics', project.conflictTopics],
    ['Work Team Avoids', project.avoidedWork],
    ['Overloaded Members', project.overloadedMember],
    ['Skills Wished For', project.wishedSkills],
    ['Ideal Interaction Style', project.idealInteractionStyle],
    ['Personality Gap', project.personalityGap],
    ['Upcoming Initiative', project.upcomingInitiative],
    ['Skills to Clone', project.cloneableSkills],
    ['Transformative Fix', project.transformativeFix],
  ];
  const hasDeepDive = deepDiveFields.some(([_, v]) => v);
  if (hasDeepDive) {
    y = ensureSpace(pdf, y, 15);
    pdf.setDrawColor(...COLORS.border);
    pdf.line(MARGIN_LEFT, y, PAGE_WIDTH - MARGIN_RIGHT, y);
    y += 5;
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.textSecondary);
    pdf.text('Deep Dive Insights', MARGIN_LEFT + 4, y);
    y += 6;

    for (const [label, value] of deepDiveFields) {
      if (!value) continue;
      const estimatedHeight = Math.ceil(value.length / 60) * 4.5 + 8;
      y = ensureSpace(pdf, y, estimatedHeight);
      y = drawKeyValuePair(pdf, label, value, y, CONTENT_WIDTH);
      y += 1;
    }
  }
  y += 4;

  // ====== CANDIDATES ASSESSED ======
  const assessedMembers = teamMembers.filter((m: any) => m.fitScores && Object.keys(m.fitScores).length > 0);
  if (assessedMembers.length > 0) {
    y = drawSectionTitle(pdf, `Candidates Assessed (${assessedMembers.length})`, y);
    applySmallText(pdf);
    pdf.setTextColor(...COLORS.textMuted);
    y = drawWrappedText(pdf, `This analysis is based on FIT assessment scores from ${assessedMembers.length} team member${assessedMembers.length !== 1 ? 's' : ''}.`, MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8);
    y += 3;

    const cols = 3;
    const cellW = CONTENT_WIDTH / cols;
    for (let i = 0; i < assessedMembers.length; i++) {
      const col = i % cols;
      if (col === 0) y = ensureSpace(pdf, y, 12);
      const cx = MARGIN_LEFT + col * cellW + 2;
      const member = assessedMembers[i];
      const initials = (member.name || 'TM').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

      pdf.setFillColor(...COLORS.blueLight);
      pdf.roundedRect(cx, y - 4, 8, 8, 2, 2, 'F');
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.primaryLight);
      pdf.text(initials, cx + 4, y + 1, { align: 'center' });

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(member.name || 'Team Member', cx + 10, y - 0.5);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text(member.role || 'Team Member', cx + 10, y + 3.5);

      if (col === cols - 1 || i === assessedMembers.length - 1) y += 12;
    }
    y += 4;
  }

  // ====== STRATEGIC ASSESSMENT ======
  if (analysis.executiveSummary) {
    y = newPage(pdf);
    y = drawSectionTitle(pdf, 'Strategic Assessment', y);
    applyBodyText(pdf);
    const paragraphs = analysis.executiveSummary.split('\n\n');
    for (const para of paragraphs) {
      y = drawWrappedText(pdf, para.trim(), MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8);
      y += 3;
    }
    y += 4;
  }

  // ====== MISSION ALIGNMENT SCORE ======
  if (missionAnalysis) {
    y = ensureSpace(pdf, y, 60);
    y = drawSectionTitle(pdf, 'Mission Alignment Score Explained', y);
    applyBodyText(pdf);
    y = drawWrappedText(
      pdf,
      `Your Mission Fit score of ${analysis.missionAlignmentScore}% measures how well your team's capabilities align with what your mission requires. Based on your mission statement, we've identified which behavioral skills are most critical for your success.`,
      MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8
    );
    y += 4;

    if (missionAnalysis.summary) {
      y = ensureSpace(pdf, y, 15);
      pdf.setFillColor(...COLORS.bgLight);
      const summaryLines = wrapText(pdf, missionAnalysis.summary, CONTENT_WIDTH - 16);
      const summaryHeight = summaryLines.length * 4.5 + 8;
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, summaryHeight, 2, 2, 'F');
      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('MISSION ANALYSIS', MARGIN_LEFT + 6, y + 2);
      y += 6;
      applyBodyText(pdf);
      for (const line of summaryLines) {
        pdf.text(line, MARGIN_LEFT + 6, y);
        y += 4.5;
      }
      y += 4;
    }

    if (missionAnalysis.capabilityPriorities?.length > 0) {
      y = ensureSpace(pdf, y, 12);
      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('WHY THESE CAPABILITIES MATTER FOR YOUR MISSION', MARGIN_LEFT + 4, y);
      y += 6;

      const sorted = [...missionAnalysis.capabilityPriorities].sort((a: any, b: any) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      });

      for (const cap of sorted) {
        const estimatedH = Math.ceil((cap.reasoning || '').length / 70) * 4 + 14;
        y = ensureSpace(pdf, y, estimatedH);
        drawCapabilityBadge(pdf, cap.code, MARGIN_LEFT + 4, y + 5);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.textSecondary);
        pdf.text(cap.name || CAP_NAMES[cap.code] || cap.code, MARGIN_LEFT + 13, y + 2);

        const priorityColors: Record<string, [number, number, number]> = {
          critical: COLORS.red,
          high: COLORS.amber,
          medium: COLORS.blue,
          low: COLORS.textMuted,
        };
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...(priorityColors[cap.priority] || COLORS.textMuted));
        pdf.text(`${cap.priority} priority`, MARGIN_LEFT + 13 + pdf.getTextWidth(cap.name || CAP_NAMES[cap.code] || cap.code) + 4, y + 2);

        if (cap.reasoning) {
          applySmallText(pdf);
          y += 6;
          y = drawWrappedText(pdf, cap.reasoning, MARGIN_LEFT + 13, y, CONTENT_WIDTH - 17, 3.8);
        }
        y += 4;
      }
    }
  }

  // ====== HEALTH SCORE EXPLAINED ======
  y = newPage(pdf);
  y = drawSectionTitle(pdf, 'Health Score Explained', y);
  applyBodyText(pdf);
  y = drawWrappedText(
    pdf,
    `Your Team Health Score of ${analysis.overallHealthScore}% is a composite metric that tells you how well-equipped your team is to achieve your mission. It combines capability strength, coverage breadth, and risk exposure into a single number.`,
    MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8
  );
  y += 6;

  // How it's calculated
  y = ensureSpace(pdf, y, 50);
  pdf.setFillColor(...COLORS.bgLight);
  pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, 46, 2, 2, 'F');
  applyLabelText(pdf);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('HOW IT\'S CALCULATED', MARGIN_LEFT + 6, y + 2);
  y += 8;

  const healthComponents = [
    { pct: '40%', title: 'Capability Strength', desc: 'Average FIT scores across all capabilities.', color: COLORS.green },
    { pct: '30%', title: 'Capability Coverage', desc: 'Whether you have at least one team member meeting target threshold for each capability.', color: COLORS.blue },
    { pct: '30%', title: 'Risk & Gap Penalties', desc: 'Deductions for critical gaps (-8 pts), warnings (-4 pts), and minor risks (-2 pts).', color: COLORS.amber },
  ];

  for (const comp of healthComponents) {
    pdf.setFillColor(...comp.color);
    pdf.circle(MARGIN_LEFT + 10, y + 1, 3, 'F');
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.white);
    pdf.text(comp.pct, MARGIN_LEFT + 10, y + 2.5, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.textSecondary);
    pdf.text(comp.title, MARGIN_LEFT + 16, y + 2);
    applySmallText(pdf);
    y += 4.5;
    pdf.text(comp.desc, MARGIN_LEFT + 16, y);
    y += 7;
  }
  y += 4;

  // Score meaning
  y = ensureSpace(pdf, y, 28);
  pdf.setFillColor(...COLORS.bgLight);
  pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, 26, 2, 2, 'F');
  applyLabelText(pdf);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('WHAT THE SCORE MEANS', MARGIN_LEFT + 6, y + 2);
  y += 7;

  const scoreMeanings = [
    { range: '80-100%', desc: 'Excellent \u2014 Well-balanced and mission-ready', color: COLORS.green },
    { range: '65-79%', desc: 'Good \u2014 Solid foundation, some areas need attention', color: [16, 185, 129] as [number, number, number] },
    { range: '50-64%', desc: 'Fair \u2014 Notable gaps may impact mission success', color: COLORS.amber },
    { range: 'Below 50%', desc: 'Needs Attention \u2014 Significant gaps requiring action', color: COLORS.red },
  ];

  for (const sm of scoreMeanings) {
    pdf.setFillColor(...sm.color);
    pdf.roundedRect(MARGIN_LEFT + 6, y - 1.5, 10, 3, 1, 1, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.textSecondary);
    pdf.text(sm.range, MARGIN_LEFT + 19, y + 0.5);
    pdf.setFont('helvetica', 'normal');
    pdf.text(sm.desc, MARGIN_LEFT + 38, y + 0.5);
    y += 4.5;
  }
  y += 6;

  // ====== CAPABILITY GAP ANALYSIS ======
  if (analysis.capabilityGapMatrix?.length > 0) {
    y = newPage(pdf);
    y = drawSectionTitle(pdf, 'Capability Gap Analysis', y);
    applyBodyText(pdf);
    y = drawWrappedText(
      pdf,
      'Compare your team\'s current capability levels against what\'s needed for mission success. The gap score shows how much additional capacity would strengthen each area.',
      MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8
    );
    y += 4;

    const strengthToScore: Record<string, number> = { strong: 85, adequate: 65, weak: 40, critical: 20 };
    const priorityToTarget: Record<string, number> = { critical: 90, high: 80, medium: 65, low: 50 };

    for (const item of analysis.capabilityGapMatrix) {
      const currentScore = item.currentScore ?? strengthToScore[item.teamStrength] ?? 50;
      const targetScore = item.targetScore ?? priorityToTarget[item.missionPriority] ?? 70;
      const gap = Math.max(0, targetScore - currentScore);
      const gapColor = gap >= 30 ? COLORS.red : gap >= 15 ? COLORS.amber : COLORS.green;
      const barColor = CAP_COLORS[item.code] || COLORS.primaryLight;
      const analysisText = item.gapAnalysis || '';
      const analysisLines = Math.ceil(analysisText.length / 70);
      const estimatedH = 30 + analysisLines * 4;

      y = ensureSpace(pdf, y, estimatedH);

      pdf.setFillColor(...COLORS.bgLight);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, estimatedH, 2, 2, 'F');

      drawCapabilityBadge(pdf, item.code, MARGIN_LEFT + 6, y + 6, 7);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(item.capability || CAP_NAMES[item.code] || item.code, MARGIN_LEFT + 16, y + 3);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...gapColor);
      const gapText = gap > 0 ? `+${gap} gap` : 'On target';
      pdf.text(gapText, PAGE_WIDTH - MARGIN_RIGHT - 6, y + 3, { align: 'right' });

      y += 10;
      drawHorizontalBar(pdf, MARGIN_LEFT + 6, y, CONTENT_WIDTH - 16, currentScore, targetScore, barColor);
      y += 8;

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text(`Current: ${currentScore}%`, MARGIN_LEFT + 6, y);
      pdf.text(`Target: ${targetScore}%`, MARGIN_LEFT + 6 + 40, y);
      y += 5;

      if (analysisText) {
        applySmallText(pdf);
        y = drawWrappedText(pdf, analysisText, MARGIN_LEFT + 6, y, CONTENT_WIDTH - 16, 3.8);
      }
      y += 6;
    }
  }

  // ====== TEAM CUMULATIVE CAPABILITY PROFILE ======
  if (cumulativeScores.length > 0) {
    y = ensureSpace(pdf, y, 80);
    if (y > MARGIN_TOP + 80) {
      y = newPage(pdf);
    }
    y = drawSectionTitle(pdf, 'Team Cumulative Capability Profile', y);
    applyBodyText(pdf);
    y = drawWrappedText(
      pdf,
      `Combined scores across all FIT capabilities for ${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}. Maximum possible score per capability: ${teamMembers.length * 100}.`,
      MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8
    );
    y += 6;

    const maxPossible = teamMembers.length * 100;
    const barAreaWidth = CONTENT_WIDTH - 50;

    for (const item of cumulativeScores) {
      y = ensureSpace(pdf, y, 14);
      const barColor = CAP_COLORS[item.code] || COLORS.primaryLight;
      const pct = maxPossible > 0 ? Math.round((item.score / maxPossible) * 100) : 0;

      drawCapabilityBadge(pdf, item.code, MARGIN_LEFT + 4, y + 5, 7);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(item.capability, MARGIN_LEFT + 14, y + 2);

      const barX = MARGIN_LEFT + 50;
      pdf.setFillColor(...COLORS.bgSection);
      pdf.roundedRect(barX, y, barAreaWidth, 5, 2, 2, 'F');
      const filledWidth = (item.score / maxPossible) * barAreaWidth;
      if (filledWidth > 0) {
        pdf.setFillColor(...barColor);
        pdf.roundedRect(barX, y, Math.min(filledWidth, barAreaWidth), 5, 2, 2, 'F');
      }

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.textSecondary);
      pdf.text(`${item.score}/${maxPossible} (${pct}%)`, barX + barAreaWidth + 2, y + 4);
      y += 12;
    }
    y += 6;
  }

  // ====== DEEP CONTEXTUAL INSIGHTS ======
  if (analysis.contextualInsights?.length > 0) {
    y = ensureSpace(pdf, y, 40);
    if (y > MARGIN_TOP + 100) {
      y = newPage(pdf);
    }
    y = drawSectionTitle(pdf, 'Deep Contextual Insights', y);

    for (const insight of analysis.contextualInsights) {
      const lines = wrapText(pdf, insight, CONTENT_WIDTH - 16);
      const blockH = lines.length * 4 + 8;
      y = ensureSpace(pdf, y, blockH);

      pdf.setFillColor(...COLORS.amberLight);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, blockH, 2, 2, 'F');
      applyBodyText(pdf);
      let iy = y + 3;
      for (const line of lines) {
        pdf.text(line, MARGIN_LEFT + 6, iy);
        iy += 4;
      }
      y += blockH + 3;
    }
    y += 4;
  }

  // ====== IDEAL CANDIDATE PROFILE ======
  if (analysis.idealCandidateProfile?.summary) {
    y = newPage(pdf);
    y = drawSectionTitle(pdf, 'Your Ideal Next Hire', y);
    applyBodyText(pdf);
    y = drawWrappedText(pdf, analysis.idealCandidateProfile.summary, MARGIN_LEFT + 4, y, CONTENT_WIDTH - 8);
    y += 6;

    const fitTargets = analysis.idealCandidateProfile.fitTargets;
    if (fitTargets && Object.keys(fitTargets).length > 0) {
      y = ensureSpace(pdf, y, 12);
      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('TARGET FIT SCORE RANGES', MARGIN_LEFT + 4, y);
      y += 6;

      for (const [code, targets] of Object.entries(fitTargets) as [string, any][]) {
        const reasoning = targets.reasoning || '';
        const estimatedH = reasoning ? Math.ceil(reasoning.length / 70) * 3.8 + 12 : 10;
        y = ensureSpace(pdf, y, estimatedH);

        drawCapabilityBadge(pdf, code, MARGIN_LEFT + 6, y + 5);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.textSecondary);
        pdf.text(CAP_NAMES[code] || code, MARGIN_LEFT + 14, y + 2);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...COLORS.primaryLight);
        pdf.text(`${targets.min}-${targets.ideal}%`, MARGIN_LEFT + 14 + pdf.getTextWidth(CAP_NAMES[code] || code) + 4, y + 2);

        if (reasoning) {
          y += 5;
          applySmallText(pdf);
          y = drawWrappedText(pdf, reasoning, MARGIN_LEFT + 14, y, CONTENT_WIDTH - 20, 3.8);
        }
        y += 4;
      }
      y += 2;
    }

    const keyTraits = analysis.idealCandidateProfile.keyTraits;
    if (keyTraits?.length > 0) {
      y = ensureSpace(pdf, y, 10 + keyTraits.length * 5);
      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.green);
      pdf.text('KEY TRAITS TO SEEK', MARGIN_LEFT + 4, y);
      y += 5;
      applyBodyText(pdf);
      for (const trait of keyTraits) {
        y = ensureSpace(pdf, y, 6);
        pdf.setFontSize(6);
        pdf.setTextColor(...COLORS.green);
        pdf.text('\u2713', MARGIN_LEFT + 6, y);
        applyBodyText(pdf);
        y = drawWrappedText(pdf, trait, MARGIN_LEFT + 12, y, CONTENT_WIDTH - 18, 4);
        y += 2;
      }
    }
  }

  // ====== RECOMMENDED HIRE PROFILES ======
  if (analysis.idealHireProfiles?.length > 0) {
    y = newPage(pdf);
    y = drawSectionTitle(pdf, 'Recommended Hire Profiles', y);

    for (const profile of analysis.idealHireProfiles) {
      const rationaleLines = Math.ceil((profile.rationale || '').length / 70);
      const behaviorsCount = profile.keyBehaviors?.length || 0;
      const redFlagsCount = profile.redFlags?.length || 0;
      const fitTargetCount = profile.fitTargets ? Object.keys(profile.fitTargets).length : 0;
      const estimatedH = 30 + rationaleLines * 4 + fitTargetCount * 6 + Math.max(behaviorsCount, redFlagsCount) * 5 + 10;

      y = ensureSpace(pdf, y, Math.min(estimatedH, 60));

      pdf.setFillColor(...COLORS.bgLight);
      const blockStartY = y - 2;

      // Priority badge
      pdf.setFillColor(...COLORS.primaryLight);
      pdf.roundedRect(MARGIN_LEFT + 4, y - 1, 22, 6, 2, 2, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.white);
      pdf.text(`Priority #${profile.priority}`, MARGIN_LEFT + 15, y + 3, { align: 'center' });

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(profile.roleTitle, MARGIN_LEFT + 30, y + 3);
      y += 10;

      if (profile.rationale) {
        applyBodyText(pdf);
        y = drawWrappedText(pdf, profile.rationale, MARGIN_LEFT + 6, y, CONTENT_WIDTH - 12);
        y += 4;
      }

      // FIT Score Targets
      if (profile.fitTargets) {
        y = ensureSpace(pdf, y, 10);
        applyLabelText(pdf);
        pdf.setFontSize(7);
        pdf.setTextColor(...COLORS.textMuted);
        pdf.text('TARGET FIT SCORES', MARGIN_LEFT + 6, y);
        y += 5;

        const entries = Object.entries(profile.fitTargets);
        const fitCols = 3;
        const fitColW = (CONTENT_WIDTH - 12) / fitCols;
        for (let fi = 0; fi < entries.length; fi++) {
          const col = fi % fitCols;
          if (col === 0 && fi > 0) y += 7;
          if (col === 0) y = ensureSpace(pdf, y, 8);
          const [code, targets] = entries[fi] as [string, any];
          const cx = MARGIN_LEFT + 6 + col * fitColW;
          drawCapabilityBadge(pdf, code, cx, y + 4, 5);
          pdf.setFontSize(7.5);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(...COLORS.textMuted);
          pdf.text(`${targets.min}-${targets.ideal}%`, cx + 8, y + 1.5);
        }
        y += 10;
      }

      // Key Behaviors & Red Flags side by side
      const hasBehaviors = profile.keyBehaviors?.length > 0;
      const hasRedFlags = profile.redFlags?.length > 0;
      if (hasBehaviors || hasRedFlags) {
        const colW2 = (CONTENT_WIDTH - 16) / 2;
        const maxItems = Math.max(profile.keyBehaviors?.length || 0, profile.redFlags?.length || 0);
        y = ensureSpace(pdf, y, 10 + maxItems * 5);

        if (hasBehaviors) {
          let by = y;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...COLORS.green);
          pdf.text('LOOK FOR', MARGIN_LEFT + 6, by);
          by += 4;
          applySmallText(pdf);
          for (const behavior of profile.keyBehaviors) {
            pdf.setTextColor(...COLORS.green);
            pdf.setFontSize(6);
            pdf.text('\u2022', MARGIN_LEFT + 8, by);
            applySmallText(pdf);
            const bLines = wrapText(pdf, behavior, colW2 - 10);
            for (const bl of bLines) {
              pdf.text(bl, MARGIN_LEFT + 12, by);
              by += 3.5;
            }
            by += 0.5;
          }
        }

        if (hasRedFlags) {
          let ry = y;
          const rfX = MARGIN_LEFT + 6 + (CONTENT_WIDTH - 12) / 2 + 4;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...COLORS.red);
          pdf.text('RED FLAGS', rfX, ry);
          ry += 4;
          applySmallText(pdf);
          for (const flag of profile.redFlags) {
            pdf.setTextColor(...COLORS.red);
            pdf.setFontSize(6);
            pdf.text('\u2022', rfX + 2, ry);
            applySmallText(pdf);
            const fLines = wrapText(pdf, flag, colW2 - 10);
            for (const fl of fLines) {
              pdf.text(fl, rfX + 6, ry);
              ry += 3.5;
            }
            ry += 0.5;
          }
        }

        const maxBH = (profile.keyBehaviors?.length || 0) * 5 + 6;
        const maxRH = (profile.redFlags?.length || 0) * 5 + 6;
        y += Math.max(maxBH, maxRH) + 2;
      }

      // Divider between profiles
      y = ensureSpace(pdf, y, 5);
      pdf.setDrawColor(...COLORS.border);
      pdf.line(MARGIN_LEFT + 10, y, PAGE_WIDTH - MARGIN_RIGHT - 10, y);
      y += 6;
    }
  }

  // ====== RISK ALERTS ======
  if (analysis.riskAlerts?.length > 0) {
    y = ensureSpace(pdf, y, 40);
    if (y > MARGIN_TOP + 120) {
      y = newPage(pdf);
    }
    y = drawSectionTitle(pdf, 'Risk Alerts', y);

    for (const alert of analysis.riskAlerts) {
      const descLines = Math.ceil((alert.description || '').length / 70);
      const recLines = Math.ceil((alert.recommendation || '').length / 70);
      const blockH = 14 + descLines * 4 + recLines * 4;
      y = ensureSpace(pdf, y, blockH);

      const alertBg = alert.severity === 'critical' ? COLORS.redLight : alert.severity === 'warning' ? COLORS.amberLight : COLORS.blueLight;
      pdf.setFillColor(...alertBg);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, blockH, 2, 2, 'F');

      const severityColor = alert.severity === 'critical' ? COLORS.red : alert.severity === 'warning' ? COLORS.amber : COLORS.blue;
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...severityColor);
      pdf.text('\u26A0', MARGIN_LEFT + 6, y + 2);
      pdf.setTextColor(...COLORS.text);
      pdf.text(alert.title, MARGIN_LEFT + 12, y + 2);

      // Severity badge
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...severityColor);
      pdf.text(alert.severity.toUpperCase(), PAGE_WIDTH - MARGIN_RIGHT - 8, y + 2, { align: 'right' });

      y += 7;
      applySmallText(pdf);
      if (alert.description) {
        y = drawWrappedText(pdf, alert.description, MARGIN_LEFT + 6, y, CONTENT_WIDTH - 16, 3.8);
        y += 2;
      }
      if (alert.recommendation) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.primaryLight);
        y = drawWrappedText(pdf, alert.recommendation, MARGIN_LEFT + 6, y, CONTENT_WIDTH - 16, 3.8);
      }
      y += 6;
    }
  }

  // ====== ADDITIONAL SERVICES ======
  y = ensureSpace(pdf, y, 55);
  if (y > MARGIN_TOP + 140) {
    y = newPage(pdf);
  }
  pdf.setFillColor(...COLORS.primaryLight);
  pdf.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 50, 3, 3, 'F');
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.white);
  pdf.text('Additional Services on Request', MARGIN_LEFT + 8, y + 10);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Contact our team to unlock these premium insights for your hiring decisions', MARGIN_LEFT + 8, y + 17);

  const services = [
    'Suggested Interview Questions',
    'Team Composition Analysis',
    'Time to Productivity Estimate',
    'Hiring Risk Analysis',
    'Development Investment Cost',
    'Cohort Benchmarking',
  ];
  const svcColW = (CONTENT_WIDTH - 16) / 3;
  for (let si = 0; si < services.length; si++) {
    const col = si % 3;
    const row = Math.floor(si / 3);
    const sx = MARGIN_LEFT + 8 + col * svcColW;
    const sy = y + 24 + row * 12;
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255, 230);
    pdf.text('\u2022 ' + services[si], sx, sy);
  }
  pdf.setTextColor(...COLORS.text);

  // ====== ADD HEADERS AND FOOTERS TO ALL PAGES ======
  const pageCount = pdf.getNumberOfPages();
  totalPages = pageCount;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addFooter(pdf, i);
    if (i > 1) {
      addHeader(pdf);
    }
  }

  const filename = `Team-Diagnostic-Report-${(companyName || 'Report').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  savePdfMobile(pdf, filename);
}
