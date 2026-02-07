import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { savePdfMobile } from './pdfStyles';

async function convertSvgsToCanvas(container: HTMLElement): Promise<Array<{ svg: SVGElement; canvas: HTMLCanvasElement; parent: Node; nextSibling: Node | null }>> {
  const svgElements = container.querySelectorAll('svg');
  const converted: Array<{ svg: SVGElement; canvas: HTMLCanvasElement; parent: Node; nextSibling: Node | null }> = [];
  
  for (const svg of Array.from(svgElements)) {
    try {
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = rect.width * 2;
          c.height = rect.height * 2;
          c.style.width = `${rect.width}px`;
          c.style.height = `${rect.height}px`;
          const ctx = c.getContext('2d');
          if (ctx) {
            ctx.scale(2, 2);
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          }
          converted.push({ svg: svg as SVGElement, canvas: c, parent: svg.parentNode!, nextSibling: svg.nextSibling });
          svg.parentNode!.replaceChild(c, svg);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        img.src = url;
      });
    } catch {
      // skip SVGs that fail
    }
  }
  return converted;
}

function restoreSvgs(converted: Array<{ svg: SVGElement; canvas: HTMLCanvasElement; parent: Node; nextSibling: Node | null }>) {
  for (const { svg, canvas: c, parent, nextSibling } of converted) {
    try {
      if (nextSibling) {
        parent.insertBefore(svg, nextSibling);
      } else {
        parent.appendChild(svg);
      }
      c.remove();
    } catch {
      // ignore restore errors
    }
  }
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

function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|android/.test(ua);
}

async function captureAndBuildPDF(
  reportElement: HTMLElement,
  scale: number,
  returnBlob: boolean,
  filename: string,
  onProgress?: (message: string) => void,
): Promise<UnifiedPDFResult> {
  onProgress?.('Capturing results...');

  const convertedSvgs = await convertSvgsToCanvas(reportElement);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(reportElement, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      removeContainer: true,
    });
  } finally {
    restoreSvgs(convertedSvgs);
  }

  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    throw new Error('Canvas capture produced empty result');
  }

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

  const mobile = isMobileDevice();
  const primaryScale = mobile ? 1 : 2;

  try {
    return await captureAndBuildPDF(reportElement, primaryScale, returnBlob, filename, onProgress);
  } catch (firstError: any) {
    console.warn('PDF generation failed with scale', primaryScale, firstError?.message);
    if (mobile) {
      throw firstError;
    }
    onProgress?.('Retrying with optimized settings...');
    try {
      return await captureAndBuildPDF(reportElement, 1, returnBlob, filename, onProgress);
    } catch (retryError: any) {
      console.error('PDF generation retry also failed:', retryError?.message);
      throw retryError;
    }
  }
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

  const mobile = isMobileDevice();
  const scale = mobile ? 1 : 2;

  onProgress?.('Capturing report...');

  const convertedSvgs2 = await convertSvgsToCanvas(element);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      removeContainer: true,
    });
  } finally {
    restoreSvgs(convertedSvgs2);
  }

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

  const mobile = isMobileDevice();
  const scale = mobile ? 1 : 2;

  onProgress?.('Capturing results...');

  const convertedSvgs3 = await convertSvgsToCanvas(reportElement);

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(reportElement, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      allowTaint: true,
      removeContainer: true,
    });
  } finally {
    restoreSvgs(convertedSvgs3);
  }

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
