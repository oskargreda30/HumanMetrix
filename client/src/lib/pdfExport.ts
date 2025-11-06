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
  skillComparison: Array<{ skillName: string; scores: Array<number | null> }>;
  averageScores: number[];
}

interface RoleFitData {
  candidate: CandidateData;
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

export async function exportComparisonPDF(data: ComparisonData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Candidate Comparison Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Candidates
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Candidates', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  data.candidates.forEach((candidate, index) => {
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : 'No Name';
    const avgScore = data.averageScores[index];
    pdf.text(`${index + 1}. ${name} - Average Score: ${avgScore}/100`, 25, yPosition);
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`   ${candidate.user.email}`, 25, yPosition + 4);
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    yPosition += 10;
  });

  yPosition += 5;

  // Skills Comparison
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skills Comparison', 20, yPosition);
  yPosition += 8;

  // Table headers
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  const colWidth = (pageWidth - 60) / data.candidates.length;
  pdf.text('Skill', 20, yPosition);
  data.candidates.forEach((candidate, index) => {
    const name = candidate.user.firstName || candidate.user.lastName
      ? `${candidate.user.firstName || ''} ${candidate.user.lastName || ''}`.trim()
      : 'Candidate ' + (index + 1);
    const shortName = name.length > 15 ? name.substring(0, 12) + '...' : name;
    pdf.text(shortName, 70 + (index * colWidth), yPosition);
  });
  yPosition += 2;

  // Line under headers
  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 5;

  // Table rows
  pdf.setFont('helvetica', 'normal');
  data.skillComparison.forEach((skill, skillIndex) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }

    // Skill name
    const skillName = skill.skillName.length > 25 ? skill.skillName.substring(0, 22) + '...' : skill.skillName;
    pdf.text(skillName, 20, yPosition);

    // Scores
    skill.scores.forEach((score, index) => {
      const scoreText = score !== null ? `${score}/100` : 'N/A';
      pdf.text(scoreText, 70 + (index * colWidth), yPosition);
    });

    yPosition += 6;

    // Alternating row background
    if (skillIndex % 2 === 0) {
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
  pdf.save(`comparison-report-${timestamp}.pdf`);
}

export async function exportRoleFitPDF(data: RoleFitData) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Role Fit Analysis Report', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Date
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Candidate Info
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Candidate', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  const candidateName = data.candidate.user.firstName || data.candidate.user.lastName
    ? `${data.candidate.user.firstName || ''} ${data.candidate.user.lastName || ''}`.trim()
    : 'No Name';
  pdf.text(candidateName, 20, yPosition);
  yPosition += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.text(data.candidate.user.email, 20, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += 12;

  // Role Info
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Target Role', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.role.name, 20, yPosition);
  yPosition += 6;
  
  if (data.role.description) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    const description = pdf.splitTextToSize(data.role.description, pageWidth - 40);
    pdf.text(description, 20, yPosition);
    yPosition += description.length * 5 + 8;
    pdf.setTextColor(0, 0, 0);
  } else {
    yPosition += 8;
  }

  // Overall Fit Score
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Overall Fit Score', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(24);
  const fitColor = data.alignment.overallFit >= 80 ? [34, 197, 94] : 
                   data.alignment.overallFit >= 60 ? [234, 179, 8] : [239, 68, 68];
  pdf.setTextColor(fitColor[0], fitColor[1], fitColor[2]);
  pdf.text(`${data.alignment.overallFit}%`, 20, yPosition);
  pdf.setTextColor(0, 0, 0);
  yPosition += 15;

  // Skill Alignment
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skill Alignment', 20, yPosition);
  yPosition += 8;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Skill', 20, yPosition);
  pdf.text('Score', 100, yPosition);
  pdf.text('Required', 130, yPosition);
  pdf.text('Gap', 160, yPosition);
  yPosition += 2;

  pdf.setDrawColor(200, 200, 200);
  pdf.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 5;

  pdf.setFont('helvetica', 'normal');
  data.alignment.skillAlignments.forEach((skill, index) => {
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    const skillName = skill.skillName.length > 30 ? skill.skillName.substring(0, 27) + '...' : skill.skillName;
    pdf.text(skillName, 20, yPosition);
    pdf.text(`${skill.candidateScore}/100`, 100, yPosition);
    pdf.text(`${skill.requiredScore}/100`, 130, yPosition);
    
    // Gap is negative when candidate score is below required
    const gapText = skill.gap > 0 ? `-${skill.gap}` : `+${Math.abs(skill.gap)}`;
    const gapColor = skill.gap <= 0 ? [34, 197, 94] : [239, 68, 68];
    pdf.setTextColor(gapColor[0], gapColor[1], gapColor[2]);
    pdf.text(gapText, 160, yPosition);
    pdf.setTextColor(0, 0, 0);

    yPosition += 6;

    if (index % 2 === 0) {
      pdf.setFillColor(245, 245, 245);
      pdf.rect(20, yPosition - 5, pageWidth - 40, 6, 'F');
    }
  });

  yPosition += 5;

  // Check if we need a new page for text sections
  if (yPosition > pageHeight - 60) {
    pdf.addPage();
    yPosition = 20;
  }

  // Strengths
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Key Strengths', 20, yPosition);
  yPosition += 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  data.alignment.strengths.forEach((strength, index) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    const strengthLines = pdf.splitTextToSize(`• ${strength}`, pageWidth - 45);
    pdf.text(strengthLines, 25, yPosition);
    yPosition += strengthLines.length * 5 + 2;
  });
  yPosition += 6;

  if (yPosition > pageHeight - 50) {
    pdf.addPage();
    yPosition = 20;
  }

  // Development Areas
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Development Areas', 20, yPosition);
  yPosition += 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  data.alignment.gaps.forEach((area, index) => {
    if (yPosition > pageHeight - 20) {
      pdf.addPage();
      yPosition = 20;
    }
    const areaLines = pdf.splitTextToSize(`• ${area}`, pageWidth - 45);
    pdf.text(areaLines, 25, yPosition);
    yPosition += areaLines.length * 5 + 2;
  });
  yPosition += 6;

  if (yPosition > pageHeight - 50) {
    pdf.addPage();
    yPosition = 20;
  }

  // Recommendations
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Recommendations', 20, yPosition);
  yPosition += 6;

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const recLines = pdf.splitTextToSize(data.alignment.recommendations, pageWidth - 40);
  pdf.text(recLines, 20, yPosition);
  yPosition += recLines.length * 5;

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
  pdf.text(`Name: ${candidateName}`, 20, yPosition);
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
