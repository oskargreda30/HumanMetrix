const fs = require('fs');
const { jsPDF } = require('jspdf');

const markdown = fs.readFileSync('attached_assets/HumanMetrix_Scoring_Framework.md', 'utf8');

const doc = new jsPDF();
const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 15;
const lineHeight = 5;
let y = margin;

const lines = markdown.split('\n');

function addPage() {
  doc.addPage();
  y = margin;
}

lines.forEach(line => {
  if (y > pageHeight - margin) {
    addPage();
  }
  
  if (line.startsWith('# ')) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    y += 5;
    doc.text(line.replace('# ', ''), margin, y);
    y += lineHeight * 2;
  } else if (line.startsWith('## ')) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    y += 3;
    doc.text(line.replace('## ', ''), margin, y);
    y += lineHeight * 1.5;
  } else if (line.startsWith('### ')) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(line.replace('### ', ''), margin, y);
    y += lineHeight * 1.2;
  } else if (line.startsWith('---')) {
    y += 3;
  } else if (line.startsWith('|')) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const cleanLine = line.replace(/\|/g, ' | ').replace(/\*\*/g, '');
    const splitLines = doc.splitTextToSize(cleanLine, pageWidth - 2 * margin);
    splitLines.forEach(l => {
      if (y > pageHeight - margin) addPage();
      doc.text(l, margin, y);
      y += lineHeight * 0.9;
    });
  } else if (line.startsWith('```')) {
    // skip code block markers
  } else if (line.trim()) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const cleanLine = line.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '');
    const splitLines = doc.splitTextToSize(cleanLine, pageWidth - 2 * margin);
    splitLines.forEach(l => {
      if (y > pageHeight - margin) addPage();
      doc.text(l, margin, y);
      y += lineHeight;
    });
  } else {
    y += lineHeight / 2;
  }
});

const pdfBuffer = doc.output('arraybuffer');
fs.writeFileSync('attached_assets/HumanMetrix_Scoring_Framework_v2.pdf', Buffer.from(pdfBuffer));
console.log('PDF created successfully at attached_assets/HumanMetrix_Scoring_Framework_v2.pdf');
