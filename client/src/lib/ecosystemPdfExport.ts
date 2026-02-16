import jsPDF from 'jspdf';
import { HUMANMETRIX_LOGO_BASE64 } from './pdfAssets';
import { applyBodyText, applySmallText, applyLabelText, savePdfMobile } from './pdfStyles';

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_LEFT = 20;
const MARGIN_RIGHT = 20;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 20;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const COLORS = {
  primary: [30, 58, 138] as [number, number, number],
  primaryLight: [59, 130, 246] as [number, number, number],
  text: [17, 24, 39] as [number, number, number],
  textSecondary: [55, 65, 81] as [number, number, number],
  textMuted: [107, 114, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  bgLight: [240, 249, 255] as [number, number, number],
  bgSection: [243, 244, 246] as [number, number, number],
  border: [229, 231, 235] as [number, number, number],
  blue: [37, 99, 235] as [number, number, number],
  blueLight: [219, 234, 254] as [number, number, number],
  blueDark: [30, 64, 175] as [number, number, number],
  blueMid: [59, 130, 246] as [number, number, number],
  slate: [100, 116, 139] as [number, number, number],
  warmDark: [180, 60, 60] as [number, number, number],
  descBox: [240, 249, 255] as [number, number, number],
  descText: [71, 85, 105] as [number, number, number],
};

const CAP_COLORS: Record<string, [number, number, number]> = {
  HA: [30, 64, 175],
  IC: [59, 130, 246],
  RA: [100, 116, 180],
  EE: [120, 100, 160],
  GM: [80, 140, 200],
  IA: [50, 100, 150],
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

function addBackgroundPattern(pdf: jsPDF) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
}

function addHeader(pdf: jsPDF) {
  pdf.setFillColor(255, 255, 255);
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
  pdf.setTextColor(0, 0, 0);
}

function addFooter(pdf: jsPDF, pageNum: number) {
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 8, { align: 'center' });
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_WIDTH - 15, PAGE_HEIGHT - 8, { align: 'right' });
  pdf.text('\u00A9 HumanMetrix', 15, PAGE_HEIGHT - 8);
  pdf.setTextColor(0, 0, 0);
}

function newPage(pdf: jsPDF): number {
  pdf.addPage();
  totalPages++;
  addBackgroundPattern(pdf);
  return MARGIN_TOP;
}

function ensureSpace(pdf: jsPDF, yPos: number, needed: number): number {
  if (yPos + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
    return newPage(pdf);
  }
  return yPos;
}

function addSectionHeader(pdf: jsPDF, title: string, yPos: number): number {
  yPos = ensureSpace(pdf, yPos, 20);
  pdf.setDrawColor(...COLORS.bgSection);
  pdf.setFillColor(...COLORS.bgSection);
  pdf.rect(MARGIN_LEFT, yPos, CONTENT_WIDTH, 12, 'F');
  pdf.setFontSize(13);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.text);
  pdf.text(title, MARGIN_LEFT + 5, yPos + 8);
  pdf.setTextColor(0, 0, 0);
  return yPos + 16;
}

function addDescriptionBox(pdf: jsPDF, text: string, yPos: number): number {
  applySmallText(pdf);
  const lines = pdf.splitTextToSize(text, CONTENT_WIDTH - 8);
  const boxH = Math.max(10, lines.length * 4 + 4);
  yPos = ensureSpace(pdf, yPos, boxH + 3);
  pdf.setFillColor(...COLORS.descBox);
  pdf.setDrawColor(...COLORS.descBox);
  pdf.roundedRect(MARGIN_LEFT, yPos - 2, CONTENT_WIDTH, boxH, 2, 2, 'F');
  pdf.setTextColor(...COLORS.descText);
  pdf.text(lines, MARGIN_LEFT + 4, yPos + 4);
  pdf.setTextColor(0, 0, 0);
  return yPos + boxH + 3;
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
  pdf.setTextColor(0, 0, 0);
}

function drawHorizontalBar(pdf: jsPDF, x: number, y: number, width: number, currentPct: number, targetPct: number, barColor: [number, number, number], barHeight: number = 5): void {
  pdf.setFillColor(...COLORS.bgSection);
  pdf.roundedRect(x, y, width, barHeight, 2, 2, 'F');
  const currentWidth = Math.min(width * (currentPct / 100), width);
  if (currentWidth > 0) {
    pdf.setFillColor(...barColor);
    pdf.roundedRect(x, y, currentWidth, barHeight, 2, 2, 'F');
  }
  const targetX = x + Math.min(width * (targetPct / 100), width);
  pdf.setDrawColor(100, 100, 100);
  pdf.setLineWidth(0.4);
  pdf.line(targetX, y - 1, targetX, y + barHeight + 1);
  pdf.setLineWidth(0.2);
}

function addReportGuidePage(pdf: jsPDF) {
  addBackgroundPattern(pdf);
  addHeader(pdf);

  let yPos = 38;

  pdf.setFillColor(...COLORS.primaryLight);
  pdf.rect(0, yPos, PAGE_WIDTH, 28, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HOW TO READ THIS REPORT', PAGE_WIDTH / 2, yPos + 12, { align: 'center' });
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('A step-by-step guide for team leaders and stakeholders', PAGE_WIDTH / 2, yPos + 21, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  yPos = 85;

  const addGuideItem = (num: number, title: string, description: string, y: number): number => {
    pdf.setFillColor(...COLORS.primaryLight);
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
    const lines = pdf.splitTextToSize(description, PAGE_WIDTH - 55);
    lines.forEach((line: string, idx: number) => {
      pdf.text(line, 34, y + 7 + (idx * 5));
    });

    return y + 10 + (lines.length * 5) + 6;
  };

  yPos = addGuideItem(1, 'Your Context',
    'Summary of your mission statement, team details, and deep dive insights you provided during setup. This is the foundation for all analysis.', yPos);

  yPos = addGuideItem(2, 'Strategic Assessment',
    'Executive summary analyzing your team\'s strengths, gaps, and strategic recommendations. Written by AI based on all available team data.', yPos);

  yPos = addGuideItem(3, 'Mission Alignment Score',
    'How well your team\'s capabilities align with what your mission requires. Identifies which behavioral skills are most critical and why.', yPos);

  yPos = addGuideItem(4, 'Health Score',
    'Overall team capability coverage, balance, and risk exposure. Combines capability strength (40%), coverage (30%), and gap penalties (30%).', yPos);

  yPos = addGuideItem(5, 'Capability Gap Analysis',
    'Visual comparison of current team capabilities vs. mission requirements. Shows gaps and target thresholds for each behavioral dimension.', yPos);

  yPos = addGuideItem(6, 'Hiring Recommendations',
    'Ideal candidate profiles with specific FIT score targets, key behaviors to look for, and red flags to watch for during interviews.', yPos);

  addGuideItem(7, 'Risk Alerts',
    'Critical warnings about team vulnerabilities including single points of failure, capability imbalances, and areas needing immediate attention.', yPos);
}

export async function generateEcosystemPdf(data: EcosystemPdfData): Promise<void> {
  const { companyName, project, analysis, missionAnalysis, teamMembers, cumulativeScores } = data;
  totalPages = 1;

  const missionScore = analysis.missionAlignmentScore ?? 0;
  const healthScore = analysis.overallHealthScore ?? 0;
  const teamSize = analysis.teamSize ?? teamMembers.length ?? 0;

  const pdf = new jsPDF('p', 'mm', 'a4');

  // ========== PAGE 1: HOW TO READ THIS REPORT ==========
  addReportGuidePage(pdf);

  // ========== PAGE 2: COVER + SUMMARY ==========
  let y = newPage(pdf);

  // Title banner - matches existing report style
  y = 32;
  pdf.setFillColor(...COLORS.primaryLight);
  pdf.rect(0, y, PAGE_WIDTH, 35, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TEAM DIAGNOSTIC REPORT', PAGE_WIDTH / 2, y + 12, { align: 'center' });
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text('COMPREHENSIVE REPORT', PAGE_WIDTH / 2, y + 20, { align: 'center' });
  pdf.setFontSize(9);
  pdf.text(
    `${companyName || 'Your Organization'} \u2022 ${teamSize} Team Members \u2022 ${new Date(analysis.generatedAt).toLocaleDateString()}`,
    PAGE_WIDTH / 2, y + 27,
    { align: 'center' }
  );
  pdf.setTextColor(0, 0, 0);
  y += 43;

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
  const missionColor = missionScore >= 70 ? COLORS.blueDark : missionScore >= 50 ? COLORS.slate : COLORS.warmDark;
  pdf.setTextColor(...missionColor);
  pdf.text(`${missionScore}%`, badgeX1 + badgeWidth / 2, y + 16, { align: 'center' });

  pdf.setFillColor(...COLORS.blueLight);
  pdf.roundedRect(badgeX2, y, badgeWidth, 20, 3, 3, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('Health Score', badgeX2 + badgeWidth / 2, y + 7, { align: 'center' });
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  const healthColor = healthScore >= 70 ? COLORS.blueDark : healthScore >= 50 ? COLORS.slate : COLORS.warmDark;
  pdf.setTextColor(...healthColor);
  pdf.text(`${healthScore}%`, badgeX2 + badgeWidth / 2, y + 16, { align: 'center' });
  pdf.setTextColor(0, 0, 0);
  y += 28;

  // ====== YOUR CONTEXT ======
  y = addSectionHeader(pdf, 'YOUR CONTEXT', y);
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
    y = addSectionHeader(pdf, `CANDIDATES ASSESSED (${assessedMembers.length})`, y);
    y = addDescriptionBox(pdf, `This analysis is based on FIT assessment scores from ${assessedMembers.length} team member${assessedMembers.length !== 1 ? 's' : ''}.`, y);

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
    y = addSectionHeader(pdf, 'STRATEGIC ASSESSMENT', y);
    y = addDescriptionBox(pdf, 'AI-generated executive summary analyzing your team\'s strengths, gaps, and strategic recommendations based on all available assessment data.', y);
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
    y = addSectionHeader(pdf, 'MISSION ALIGNMENT SCORE', y);
    y = addDescriptionBox(pdf,
      `Your Mission Fit score of ${missionScore}% measures how well your team's capabilities align with what your mission requires. Based on your mission statement, we've identified which behavioral skills are most critical for your success.`,
      y
    );

    if (missionAnalysis.summary) {
      applyBodyText(pdf);
      const summaryLines = wrapText(pdf, missionAnalysis.summary, CONTENT_WIDTH - 16);
      const summaryBoxH = summaryLines.length * 4.5 + 12;
      y = ensureSpace(pdf, y, summaryBoxH);

      pdf.setFillColor(...COLORS.descBox);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, summaryBoxH, 2, 2, 'F');

      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('MISSION ANALYSIS', MARGIN_LEFT + 6, y + 2);
      y += 8;
      applyBodyText(pdf);
      for (const line of summaryLines) {
        pdf.text(line, MARGIN_LEFT + 6, y);
        y += 4.5;
      }
      y += 8;
    }

    if (missionAnalysis.capabilityPriorities?.length > 0) {
      const sorted = [...missionAnalysis.capabilityPriorities].sort((a: any, b: any) => {
        const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      });

      applySmallText(pdf);
      let totalSectionH = 10;
      for (const cap of sorted) {
        const reasoningLines = cap.reasoning ? wrapText(pdf, cap.reasoning, CONTENT_WIDTH - 18) : [];
        totalSectionH += 6 + (reasoningLines.length > 0 ? reasoningLines.length * 3.8 + 2 : 0) + 4;
      }

      if (y + totalSectionH > PAGE_HEIGHT - MARGIN_BOTTOM) {
        y = newPage(pdf);
      }

      applyLabelText(pdf);
      pdf.setFontSize(7);
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text('WHY THESE CAPABILITIES MATTER FOR YOUR MISSION', MARGIN_LEFT + 4, y);
      y += 6;

      for (const cap of sorted) {
        drawCapabilityBadge(pdf, cap.code, MARGIN_LEFT + 4, y + 5);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.textSecondary);
        const capNameText = cap.name || CAP_NAMES[cap.code] || cap.code;
        pdf.text(capNameText, MARGIN_LEFT + 14, y + 2);
        const capNameWidth = pdf.getTextWidth(capNameText);

        const priorityColors: Record<string, [number, number, number]> = {
          critical: COLORS.warmDark,
          high: COLORS.blueDark,
          medium: COLORS.blueMid,
          low: COLORS.textMuted,
        };
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...(priorityColors[cap.priority] || COLORS.textMuted));
        pdf.text(`${cap.priority} priority`, MARGIN_LEFT + 14 + capNameWidth + 4, y + 2);

        if (cap.reasoning) {
          applySmallText(pdf);
          y += 6;
          y = drawWrappedText(pdf, cap.reasoning, MARGIN_LEFT + 14, y, CONTENT_WIDTH - 18, 3.8);
        }
        y += 4;
      }
    }
  }

  // ====== HEALTH SCORE EXPLAINED ======
  y = newPage(pdf);
  y = addSectionHeader(pdf, 'HEALTH SCORE EXPLAINED', y);
  y = addDescriptionBox(pdf,
    `Your Team Health Score of ${healthScore}% is a composite metric that tells you how well-equipped your team is to achieve your mission. It combines capability strength, coverage breadth, and risk exposure into a single number.`,
    y
  );

  // How it's calculated - dynamic height
  const healthComponents = [
    { pct: '40%', title: 'Capability Strength', desc: 'Average FIT scores across all capabilities.', color: [30, 64, 175] as [number, number, number] },
    { pct: '30%', title: 'Capability Coverage', desc: 'Whether you have at least one team member meeting target threshold for each capability.', color: [59, 130, 246] as [number, number, number] },
    { pct: '30%', title: 'Risk & Gap Penalties', desc: 'Deductions for critical gaps (-8 pts), warnings (-4 pts), and minor risks (-2 pts).', color: [100, 160, 220] as [number, number, number] },
  ];

  // Measure each component's description height for accurate box sizing
  applySmallText(pdf);
  let totalCompH = 8;
  const compMeasurements: { lines: string[]; lineH: number }[] = [];
  for (const comp of healthComponents) {
    const descLines = pdf.splitTextToSize(comp.desc, CONTENT_WIDTH - 24);
    const itemH = 4.5 + descLines.length * 3.5 + 6;
    compMeasurements.push({ lines: descLines, lineH: itemH });
    totalCompH += itemH;
  }
  const calcBoxH = totalCompH + 4;
  y = ensureSpace(pdf, y, calcBoxH);
  const calcBoxStartY = y - 2;
  pdf.setFillColor(...COLORS.descBox);
  pdf.roundedRect(MARGIN_LEFT + 2, calcBoxStartY, CONTENT_WIDTH - 4, calcBoxH, 2, 2, 'F');
  applyLabelText(pdf);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('HOW IT\'S CALCULATED', MARGIN_LEFT + 6, y + 2);
  y += 8;

  for (let ci = 0; ci < healthComponents.length; ci++) {
    const comp = healthComponents[ci];
    const measurement = compMeasurements[ci];
    pdf.setFillColor(...comp.color);
    pdf.circle(MARGIN_LEFT + 10, y + 1, 3, 'F');
    pdf.setFontSize(5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(255, 255, 255);
    pdf.text(comp.pct, MARGIN_LEFT + 10, y + 2.5, { align: 'center' });
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.textSecondary);
    pdf.text(comp.title, MARGIN_LEFT + 16, y + 2);
    applySmallText(pdf);
    y += 4.5;
    for (const line of measurement.lines) {
      pdf.text(line, MARGIN_LEFT + 16, y);
      y += 3.5;
    }
    y += 6;
  }
  y += 4;

  // Score meaning
  const scoreMeanings = [
    { range: '80-100%', desc: 'Excellent \u2014 Well-balanced and mission-ready', color: [30, 64, 175] as [number, number, number] },
    { range: '65-79%', desc: 'Good \u2014 Solid foundation, some areas need attention', color: [59, 130, 246] as [number, number, number] },
    { range: '50-64%', desc: 'Fair \u2014 Notable gaps may impact mission success', color: [147, 180, 220] as [number, number, number] },
    { range: 'Below 50%', desc: 'Needs Attention \u2014 Significant gaps requiring action', color: [190, 200, 215] as [number, number, number] },
  ];

  const scoreBoxH = scoreMeanings.length * 4.5 + 10;
  y = ensureSpace(pdf, y, scoreBoxH);
  const scoreBoxStartY = y - 2;
  pdf.setFillColor(...COLORS.descBox);
  pdf.roundedRect(MARGIN_LEFT + 2, scoreBoxStartY, CONTENT_WIDTH - 4, scoreBoxH, 2, 2, 'F');
  applyLabelText(pdf);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('WHAT THE SCORE MEANS', MARGIN_LEFT + 6, y + 2);
  y += 7;

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
    y = addSectionHeader(pdf, 'CAPABILITY GAP ANALYSIS', y);
    y = addDescriptionBox(pdf,
      'Compare your team\'s current capability levels against what\'s needed for mission success. The gap score shows how much additional capacity would strengthen each area.',
      y
    );

    const strengthToScore: Record<string, number> = { strong: 85, adequate: 65, weak: 40, critical: 20 };
    const priorityToTarget: Record<string, number> = { critical: 90, high: 80, medium: 65, low: 50 };

    const GAP_BAR_HEIGHT = 7;
    const GAP_BADGE_SIZE = 7;
    const GAP_ITEM_PAD = 5;

    for (const item of analysis.capabilityGapMatrix) {
      const currentScore = item.currentScore ?? strengthToScore[item.teamStrength] ?? 50;
      const targetScore = item.targetScore ?? priorityToTarget[item.missionPriority] ?? 70;
      const gap = Math.max(0, targetScore - currentScore);
      const gapColor = gap >= 30 ? COLORS.warmDark : gap >= 15 ? COLORS.slate : COLORS.blueMid;
      const barColor = CAP_COLORS[item.code] || COLORS.primaryLight;
      const analysisText = item.gapAnalysis || '';

      applySmallText(pdf);
      pdf.setFontSize(7);
      const analysisLines = analysisText ? wrapText(pdf, analysisText, CONTENT_WIDTH - 20) : [];
      const contentH = GAP_ITEM_PAD + 10 + GAP_BAR_HEIGHT + 5 + (analysisLines.length > 0 ? analysisLines.length * 3.4 + 3 : 0) + GAP_ITEM_PAD;

      y = ensureSpace(pdf, y, contentH + 4);

      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 1, CONTENT_WIDTH - 4, contentH, 2, 2, 'F');

      y += GAP_ITEM_PAD;

      const badgeCenterY = y + GAP_BADGE_SIZE / 2;
      drawCapabilityBadge(pdf, item.code, MARGIN_LEFT + 7, badgeCenterY + GAP_BADGE_SIZE / 2 - 1, GAP_BADGE_SIZE);
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...COLORS.text);
      pdf.text(item.capability || CAP_NAMES[item.code] || item.code, MARGIN_LEFT + 17, y + 3);

      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...gapColor);
      const gapText = gap > 0 ? `+${gap} gap` : 'On target';
      pdf.text(gapText, PAGE_WIDTH - MARGIN_RIGHT - 6, y + 3, { align: 'right' });

      y += 10;
      drawHorizontalBar(pdf, MARGIN_LEFT + 7, y, CONTENT_WIDTH - 18, currentScore, targetScore, barColor, GAP_BAR_HEIGHT);
      y += GAP_BAR_HEIGHT + 2;

      pdf.setFontSize(6.5);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(...COLORS.textMuted);
      pdf.text(`Current: ${currentScore}%`, MARGIN_LEFT + 7, y + 1);
      const targetLabelX = MARGIN_LEFT + 7 + (CONTENT_WIDTH - 18) * (targetScore / 100) - 8;
      const clampedTargetX = Math.min(Math.max(MARGIN_LEFT + 42, targetLabelX), PAGE_WIDTH - MARGIN_RIGHT - 22);
      pdf.text(`Target: ${targetScore}%`, clampedTargetX, y + 1);
      y += 5;

      if (analysisLines.length > 0) {
        pdf.setFontSize(7);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...COLORS.textSecondary);
        for (const line of analysisLines) {
          pdf.text(line, MARGIN_LEFT + 7, y);
          y += 3.4;
        }
      }

      y += GAP_ITEM_PAD + 2;
    }
  }

  // ====== TEAM CUMULATIVE CAPABILITY PROFILE ======
  if (cumulativeScores.length > 0) {
    y = ensureSpace(pdf, y, 80);
    y = addSectionHeader(pdf, 'TEAM CUMULATIVE CAPABILITY PROFILE', y);
    y = addDescriptionBox(pdf,
      `Combined scores across all FIT capabilities for ${teamMembers.length} team member${teamMembers.length !== 1 ? 's' : ''}. Maximum possible score per capability: ${teamMembers.length * 100}.`,
      y
    );

    const maxPossible = teamMembers.length * 100;
    const barAreaWidth = CONTENT_WIDTH - 65;

    for (const item of cumulativeScores) {
      y = ensureSpace(pdf, y, 14);
      const barColor: [number, number, number] = [100, 130, 180];
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
    y = newPage(pdf);
    y = addSectionHeader(pdf, 'DEEP CONTEXTUAL INSIGHTS', y);
    y = addDescriptionBox(pdf,
      'Forward-looking analysis connecting your team\'s current capability profile with organizational context, future needs, and strategic considerations.',
      y
    );

    const categoryLabels: Record<string, string> = {
      team_dynamics: 'TEAM DYNAMICS',
      future_needs: 'FUTURE NEEDS',
      post_hire_outlook: 'POST-HIRE OUTLOOK',
      strategic_risk: 'STRATEGIC RISK',
    };
    const categoryColors: Record<string, [number, number, number]> = {
      team_dynamics: COLORS.blueDark,
      future_needs: COLORS.blueMid,
      post_hire_outlook: COLORS.slate,
      strategic_risk: [50, 100, 150],
    };

    for (const insight of analysis.contextualInsights) {
      const isStructured = typeof insight === 'object' && insight.title;
      const analysisText = isStructured ? insight.analysis : (typeof insight === 'string' ? insight : '');
      const title = isStructured ? insight.title : '';
      const category = isStructured ? insight.category : '';

      applyBodyText(pdf);
      const analysisLines = wrapText(pdf, analysisText, CONTENT_WIDTH - 16);
      const blockH = (title ? 8 : 0) + analysisLines.length * 4.2 + 8;
      y = ensureSpace(pdf, y, blockH);

      pdf.setFillColor(...COLORS.blueLight);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, blockH, 2, 2, 'F');

      let iy = y + 2;

      if (title) {
        if (category && categoryLabels[category]) {
          const catColor = categoryColors[category] || COLORS.textMuted;
          pdf.setFontSize(6);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...catColor);
          pdf.text(categoryLabels[category], PAGE_WIDTH - MARGIN_RIGHT - 6, iy + 1, { align: 'right' });
        }

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.text);
        pdf.text(title, MARGIN_LEFT + 6, iy + 1);
        iy += 7;
      }

      applyBodyText(pdf);
      pdf.setTextColor(...COLORS.textSecondary);
      for (const line of analysisLines) {
        pdf.text(line, MARGIN_LEFT + 6, iy);
        iy += 4.2;
      }
      y += blockH + 6;
    }
    y += 4;
  }

  // ====== IDEAL CANDIDATE PROFILE ======
  if (analysis.idealCandidateProfile?.summary) {
    y = newPage(pdf);
    y = addSectionHeader(pdf, 'YOUR IDEAL NEXT HIRE', y);
    y = addDescriptionBox(pdf, 'AI-recommended candidate profile based on your team\'s current gaps and mission requirements.', y);
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
        const capName = CAP_NAMES[code] || code;
        pdf.text(capName, MARGIN_LEFT + 16, y + 2);
        const nameWidth = pdf.getTextWidth(capName);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(...COLORS.primaryLight);
        pdf.text(`${targets.min}-${targets.ideal}%`, MARGIN_LEFT + 16 + nameWidth + 4, y + 2);

        if (reasoning) {
          y += 5;
          applySmallText(pdf);
          y = drawWrappedText(pdf, reasoning, MARGIN_LEFT + 16, y, CONTENT_WIDTH - 22, 3.8);
        }
        y += 4;
      }
      y += 2;
    }

  }

  // ====== RECOMMENDED HIRE PROFILES ======
  if (analysis.idealHireProfiles?.length > 0) {
    y = newPage(pdf);
    y = addSectionHeader(pdf, 'RECOMMENDED HIRE PROFILES', y);
    y = addDescriptionBox(pdf, 'Prioritized hiring recommendations with specific role profiles, FIT score targets, key behaviors to seek, and red flags to watch for.', y);

    for (const profile of analysis.idealHireProfiles) {
      const rationaleLines = Math.ceil((profile.rationale || '').length / 70);
      const behaviorsCount = profile.keyBehaviors?.length || 0;
      const redFlagsCount = profile.redFlags?.length || 0;
      const fitTargetCount = profile.fitTargets ? Object.keys(profile.fitTargets).length : 0;
      const estimatedH = 30 + rationaleLines * 4 + fitTargetCount * 6 + Math.max(behaviorsCount, redFlagsCount) * 5 + 10;

      y = ensureSpace(pdf, y, Math.min(estimatedH, 60));

      // Priority badge
      pdf.setFillColor(...COLORS.primaryLight);
      pdf.roundedRect(MARGIN_LEFT + 4, y - 1, 22, 6, 2, 2, 'F');
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
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

        let colEndY = y;

        if (hasBehaviors) {
          let by = y;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...COLORS.blueDark);
          pdf.text('LOOK FOR', MARGIN_LEFT + 6, by);
          by += 4;
          applySmallText(pdf);
          for (const behavior of profile.keyBehaviors) {
            pdf.setTextColor(...COLORS.blueDark);
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
          colEndY = Math.max(colEndY, by);
        }

        if (hasRedFlags) {
          let ry = y;
          const rfX = MARGIN_LEFT + 6 + (CONTENT_WIDTH - 12) / 2 + 4;
          pdf.setFontSize(7);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(...COLORS.warmDark);
          pdf.text('RED FLAGS', rfX, ry);
          ry += 4;
          applySmallText(pdf);
          for (const flag of profile.redFlags) {
            pdf.setTextColor(...COLORS.warmDark);
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
          colEndY = Math.max(colEndY, ry);
        }

        y = colEndY + 2;
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
    y = addSectionHeader(pdf, 'RISK ALERTS', y);

    for (const alert of analysis.riskAlerts) {
      const alertBg = alert.severity === 'critical' ? [245, 235, 240] as [number, number, number] : alert.severity === 'warning' ? COLORS.bgSection : COLORS.blueLight;
      const severityColor = alert.severity === 'critical' ? COLORS.warmDark : alert.severity === 'warning' ? COLORS.slate : COLORS.blueMid;

      // Measure content first
      applySmallText(pdf);
      const descLines = alert.description ? wrapText(pdf, alert.description, CONTENT_WIDTH - 16) : [];
      const recLines = alert.recommendation ? wrapText(pdf, alert.recommendation, CONTENT_WIDTH - 16) : [];
      const blockH = 10 + descLines.length * 3.8 + (recLines.length > 0 ? recLines.length * 3.8 + 4 : 0);

      y = ensureSpace(pdf, y, blockH + 4);

      pdf.setFillColor(...alertBg);
      pdf.roundedRect(MARGIN_LEFT + 2, y - 2, CONTENT_WIDTH - 4, blockH, 2, 2, 'F');

      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...severityColor);
      pdf.text('\u26A0', MARGIN_LEFT + 6, y + 2);
      pdf.setTextColor(...COLORS.text);
      pdf.text(alert.title, MARGIN_LEFT + 12, y + 2);

      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(...severityColor);
      pdf.text((alert.severity || '').toUpperCase(), PAGE_WIDTH - MARGIN_RIGHT - 8, y + 2, { align: 'right' });

      y += 7;
      if (descLines.length > 0) {
        applySmallText(pdf);
        for (const line of descLines) {
          pdf.text(line, MARGIN_LEFT + 6, y);
          y += 3.8;
        }
        y += 2;
      }
      if (recLines.length > 0) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(...COLORS.primaryLight);
        for (const line of recLines) {
          pdf.text(line, MARGIN_LEFT + 6, y);
          y += 3.8;
        }
      }
      y += 6;
    }
  }

  // ====== ADDITIONAL SERVICES ======
  y = newPage(pdf);
  y = addSectionHeader(pdf, 'ADDITIONAL SERVICES ON REQUEST', y);
  y += 3;

  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.textMuted);
  pdf.text('Contact our team to unlock these premium insights for your hiring decisions:', MARGIN_LEFT + 2, y);
  y += 8;

  const additionalServices = [
    { name: 'Suggested Interview Questions', description: 'AI-generated questions based on candidates\' assessment results and identified skill gaps' },
    { name: 'Team Composition Analysis', description: 'Analysis of how candidates would complement your existing team dynamics' },
    { name: 'Time to Productivity Estimate', description: 'Projected onboarding timeline based on skill readiness and learning agility' },
    { name: 'Hiring Risk Analysis', description: 'Comprehensive risk assessment highlighting potential challenges and mitigations' },
    { name: 'Development Investment Cost', description: 'Estimated training and development investment to close identified skill gaps' },
    { name: 'Cohort Benchmarking', description: 'Compare team performance against industry cohorts and best-in-class benchmarks' },
  ];

  for (let si = 0; si < additionalServices.length; si++) {
    const service = additionalServices[si];
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    const descLines = pdf.splitTextToSize(service.description, CONTENT_WIDTH - 18);
    const serviceHeight = 7 + descLines.length * 4 + 4;
    y = ensureSpace(pdf, y, serviceHeight);

    pdf.setFillColor(...COLORS.primaryLight);
    pdf.roundedRect(MARGIN_LEFT + 2, y - 2, 6, 6, 1, 1, 'F');
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${si + 1}`, MARGIN_LEFT + 5, y + 2, { align: 'center' });

    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.text);
    pdf.text(service.name, MARGIN_LEFT + 12, y + 2);

    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.textMuted);
    for (let di = 0; di < descLines.length; di++) {
      pdf.text(descLines[di], MARGIN_LEFT + 12, y + 7 + di * 4);
    }

    y += serviceHeight;
  }

  y += 6;

  y = ensureSpace(pdf, y, 20);
  pdf.setFillColor(239, 246, 255);
  pdf.setDrawColor(...COLORS.primaryLight);
  pdf.roundedRect(MARGIN_LEFT, y, CONTENT_WIDTH, 14, 2, 2, 'FD');
  pdf.setFontSize(9);
  pdf.setTextColor(...COLORS.primary);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Contact the HumanMetrix team to learn more about these services', MARGIN_LEFT + 5, y + 5);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text('hello@humanmetrix.co.uk', MARGIN_LEFT + 5, y + 10);
  pdf.setTextColor(0, 0, 0);

  // ====== ADD HEADERS AND FOOTERS TO ALL PAGES ======
  const pageCount = pdf.getNumberOfPages();
  totalPages = pageCount;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    addHeader(pdf);
    addFooter(pdf, i);
  }

  const filename = `Team-Diagnostic-Report-${(companyName || 'Report').replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  savePdfMobile(pdf, filename);
}
