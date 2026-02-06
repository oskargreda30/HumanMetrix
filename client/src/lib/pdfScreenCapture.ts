import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { savePdfMobile } from './pdfStyles';

export interface UnifiedPDFOptions {
  elementId: string;
  filename?: string;
  candidateName?: string;
  assessmentType?: string;
  onProgress?: (message: string) => void;
  returnBlob?: boolean;
}

export interface UnifiedPDFResult {
  blob?: Blob;
  saved: boolean;
}

export async function exportResultsPDF(options: UnifiedPDFOptions): Promise<UnifiedPDFResult> {
  const { 
    elementId, 
    filename = 'assessment-results.pdf', 
    onProgress,
    returnBlob = false 
  } = options;

  onProgress?.('Preparing results view...');

  const reportElement = document.getElementById(elementId);
  if (!reportElement) {
    throw new Error('Results element not found');
  }

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  onProgress?.('Capturing results...');

  const canvas = await html2canvas(reportElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
    removeContainer: true,
  });

  onProgress?.('Generating PDF...');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;

  let heightLeft = imgHeight * ratio;
  let position = 0;

  pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight * ratio;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
    heightLeft -= pdfHeight;
  }

  if (returnBlob) {
    const blob = pdf.output('blob');
    return { blob, saved: false };
  }

  onProgress?.('Saving PDF...');
  savePdfMobile(pdf, filename);
  return { saved: true };
}

export async function exportScreenCapturePDF(options: { reportElementId: string; filename?: string; onProgress?: (message: string) => void }): Promise<void> {
  await exportResultsPDF({
    elementId: options.reportElementId,
    filename: options.filename || 'comparison-report.pdf',
    onProgress: options.onProgress,
  });
}

export async function exportElementAsPDF(
  element: HTMLElement,
  filename: string = 'report.pdf',
  onProgress?: (message: string) => void
): Promise<void> {
  onProgress?.('Preparing report...');

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  onProgress?.('Capturing report...');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
    removeContainer: true,
  });

  onProgress?.('Generating PDF...');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;

  let heightLeft = imgHeight * ratio;
  let position = 0;

  pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight * ratio;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
    heightLeft -= pdfHeight;
  }

  onProgress?.('Saving PDF...');
  savePdfMobile(pdf, filename);
}

export interface Base64PDFOptions {
  elementId: string;
  candidateName?: string;
  assessmentType?: string;
  onProgress?: (message: string) => void;
}

export async function getBase64FromPDF(options: Base64PDFOptions): Promise<string> {
  const { elementId, onProgress } = options;

  onProgress?.('Preparing results view...');

  const reportElement = document.getElementById(elementId);
  if (!reportElement) {
    throw new Error('Results element not found');
  }

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 300));

  onProgress?.('Capturing results...');

  const canvas = await html2canvas(reportElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    allowTaint: true,
    removeContainer: true,
  });

  onProgress?.('Generating PDF...');

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgX = (pdfWidth - imgWidth * ratio) / 2;

  let heightLeft = imgHeight * ratio;
  let position = 0;

  pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight * ratio;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', imgX, position, imgWidth * ratio, imgHeight * ratio);
    heightLeft -= pdfHeight;
  }

  const base64 = pdf.output('datauristring').split(',')[1];
  return base64;
}

export function enableReportMode(rootElement: HTMLElement): void {
  rootElement.classList.add('report-mode');
}

export function disableReportMode(rootElement: HTMLElement): void {
  rootElement.classList.remove('report-mode');
}
