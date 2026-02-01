import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { savePdfMobile } from './pdfStyles';

interface ScreenCapturePDFOptions {
  reportElementId: string;
  filename?: string;
  onProgress?: (message: string) => void;
}

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
    candidateName,
    assessmentType,
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

  const sections = reportElement.querySelectorAll('[data-pdf-section]');
  const sectionImages: { image: string; width: number; height: number }[] = [];

  if (sections.length > 0) {
    for (const section of Array.from(sections)) {
      try {
        const canvas = await html2canvas(section as HTMLElement, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          logging: false,
          allowTaint: true,
          removeContainer: true,
        });

        sectionImages.push({
          image: canvas.toDataURL('image/png'),
          width: canvas.width,
          height: canvas.height,
        });
      } catch (err) {
        console.error('Error capturing section:', err);
      }
    }
  }

  if (sectionImages.length === 0) {
    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        removeContainer: true,
      });

      sectionImages.push({
        image: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    } catch (err) {
      console.error('Error capturing full results:', err);
      throw new Error('Failed to capture results');
    }
  }

  onProgress?.('Generating PDF...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;
  let isFirstPage = true;

  for (let i = 0; i < sectionImages.length; i++) {
    const section = sectionImages[i];
    const aspectRatio = section.height / section.width;
    const imageWidth = contentWidth;
    const imageHeight = imageWidth * aspectRatio;

    if (!isFirstPage || currentY + imageHeight > pageHeight - margin) {
      if (currentY > margin) {
        pdf.addPage();
        currentY = margin;
      }
    }

    if (imageHeight > pageHeight - (margin * 2)) {
      const maxHeight = pageHeight - (margin * 2);
      const scaledWidth = maxHeight / aspectRatio;
      const xOffset = margin + (contentWidth - scaledWidth) / 2;
      pdf.addImage(section.image, 'PNG', xOffset, currentY, scaledWidth, maxHeight);
      currentY = pageHeight;
    } else {
      pdf.addImage(section.image, 'PNG', margin, currentY, imageWidth, imageHeight);
      currentY += imageHeight + 5;
    }

    isFirstPage = false;
  }

  if (returnBlob) {
    const blob = pdf.output('blob');
    return { blob, saved: false };
  }

  onProgress?.('Saving PDF...');
  savePdfMobile(pdf, filename);
  return { saved: true };
}

export async function exportScreenCapturePDF(options: ScreenCapturePDFOptions): Promise<void> {
  const { reportElementId, filename = 'comparison-report.pdf', onProgress } = options;

  onProgress?.('Preparing report view...');

  const reportElement = document.getElementById(reportElementId);
  if (!reportElement) {
    throw new Error('Report element not found');
  }

  await document.fonts.ready;
  await new Promise(resolve => setTimeout(resolve, 500));

  onProgress?.('Capturing report sections...');

  const sections = reportElement.querySelectorAll('[data-pdf-section]');
  const sectionImages: { image: string; width: number; height: number }[] = [];

  for (const section of Array.from(sections)) {
    try {
      const canvas = await html2canvas(section as HTMLElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        removeContainer: true,
      });

      sectionImages.push({
        image: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    } catch (err) {
      console.error('Error capturing section:', err);
    }
  }

  if (sectionImages.length === 0) {
    try {
      const canvas = await html2canvas(reportElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        removeContainer: true,
      });

      sectionImages.push({
        image: canvas.toDataURL('image/png'),
        width: canvas.width,
        height: canvas.height,
      });
    } catch (err) {
      console.error('Error capturing full report:', err);
      throw new Error('Failed to capture report');
    }
  }

  onProgress?.('Generating PDF...');

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  let currentY = margin;
  let isFirstPage = true;

  for (let i = 0; i < sectionImages.length; i++) {
    const section = sectionImages[i];
    const aspectRatio = section.height / section.width;
    const imageWidth = contentWidth;
    const imageHeight = imageWidth * aspectRatio;

    if (!isFirstPage || currentY + imageHeight > pageHeight - margin) {
      if (currentY > margin) {
        pdf.addPage();
        currentY = margin;
      }
    }

    if (imageHeight > pageHeight - (margin * 2)) {
      const maxHeight = pageHeight - (margin * 2);
      const scaledWidth = maxHeight / aspectRatio;
      const xOffset = margin + (contentWidth - scaledWidth) / 2;
      pdf.addImage(section.image, 'PNG', xOffset, currentY, scaledWidth, maxHeight);
      currentY = pageHeight;
    } else {
      pdf.addImage(section.image, 'PNG', margin, currentY, imageWidth, imageHeight);
      currentY += imageHeight + 5;
    }

    isFirstPage = false;
  }

  onProgress?.('Saving PDF...');
  savePdfMobile(pdf, filename);
}

export function enableReportMode(rootElement: HTMLElement): void {
  rootElement.classList.add('report-mode');
}

export function disableReportMode(rootElement: HTMLElement): void {
  rootElement.classList.remove('report-mode');
}
