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

export interface ReceiptData {
  receiptNumber: string;
  date: Date;
  partnerName: string;
  companyName: string;
  billingType: 'enterprise' | 'subscription' | 'payg';
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
  vatNumber?: string;
  items: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  taxRate?: number;
  total: number;
  currency: string;
  paymentMethod?: string;
  paymentDate?: Date;
  transactionId?: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  AUD: 'A$',
  CAD: 'C$',
  SGD: 'S$',
  HKD: 'HK$',
  NZD: 'NZ$',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  PHP: '₱',
  MYR: 'RM',
  THB: '฿',
  IDR: 'Rp',
  VND: '₫',
  KRW: '₩',
};

const ZERO_DECIMAL_CURRENCIES = ['JPY', 'KRW', 'VND', 'IDR'];

function formatCurrency(amountInSmallestUnit: number, currency: string): string {
  const currencyUpper = (currency || 'GBP').toUpperCase();
  const symbol = CURRENCY_SYMBOLS[currencyUpper] || currencyUpper + ' ';
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.includes(currencyUpper);
  
  if (isZeroDecimal) {
    return `${symbol}${amountInSmallestUnit.toLocaleString()}`;
  }
  
  const amount = amountInSmallestUnit / 100;
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function addHeader(pdf: jsPDF, pageWidth: number) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  
  try {
    if (HUMANMETRIX_LOGO_BASE64) {
      pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', 15, 8, 32, 32);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  pdf.setTextColor(30, 58, 138);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('HUMANMETRIX', 52, 22);
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('AI-Powered Assessment Platform', 52, 30);
  
  pdf.setTextColor(0, 0, 0);
}

function addCompanyDetails(pdf: jsPDF, pageWidth: number, yPosition: number): number {
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  
  const companyInfo = [
    'HumanMetrix Ltd',
    '8 Cygnet Way',
    'Northampton, NN4 9BS',
    'United Kingdom',
    '',
    'assessments@humanmetrix.co.uk',
    'www.humanmetrix.co.uk',
  ];
  
  companyInfo.forEach((line, index) => {
    pdf.text(line, pageWidth - 20, yPosition + (index * 4), { align: 'right' });
  });
  
  pdf.setTextColor(0, 0, 0);
  return yPosition + (companyInfo.length * 4) + 5;
}

function addReceiptTitle(pdf: jsPDF, receiptNumber: string, yPosition: number): number {
  pdf.setFillColor(30, 58, 138);
  pdf.setDrawColor(30, 58, 138);
  pdf.roundedRect(20, yPosition, 60, 12, 2, 2, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEIPT', 50, yPosition + 8.5, { align: 'center' });
  
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${receiptNumber}`, 85, yPosition + 8);
  
  pdf.setTextColor(0, 0, 0);
  return yPosition + 20;
}

function addBillToSection(pdf: jsPDF, data: ReceiptData, yPosition: number): number {
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('Bill To:', 20, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  
  let y = yPosition + 6;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.companyName || data.partnerName, 20, y);
  y += 5;
  
  pdf.setFont('helvetica', 'normal');
  if (data.billingAddress?.line1) {
    pdf.text(data.billingAddress.line1, 20, y);
    y += 4;
  }
  if (data.billingAddress?.line2) {
    pdf.text(data.billingAddress.line2, 20, y);
    y += 4;
  }
  if (data.billingAddress?.city || data.billingAddress?.postcode) {
    const cityPostcode = [data.billingAddress.city, data.billingAddress.postcode].filter(Boolean).join(', ');
    pdf.text(cityPostcode, 20, y);
    y += 4;
  }
  if (data.billingAddress?.country) {
    pdf.text(data.billingAddress.country, 20, y);
    y += 4;
  }
  if (data.vatNumber) {
    pdf.setFontSize(9);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`VAT: ${data.vatNumber}`, 20, y);
    y += 4;
  }
  
  pdf.setTextColor(0, 0, 0);
  return y + 6;
}

function addReceiptDetails(pdf: jsPDF, data: ReceiptData, pageWidth: number, yPosition: number): number {
  const detailsX = pageWidth - 70;
  
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  
  const details = [
    { label: 'Receipt Date:', value: formatDate(data.date) },
    { label: 'Payment Date:', value: data.paymentDate ? formatDate(data.paymentDate) : formatDate(data.date) },
  ];
  
  if (data.paymentMethod) {
    details.push({ label: 'Payment Method:', value: data.paymentMethod });
  }
  
  if (data.transactionId) {
    details.push({ label: 'Transaction ID:', value: data.transactionId });
  }
  
  details.forEach((detail, index) => {
    const y = yPosition + (index * 5);
    pdf.setTextColor(100, 100, 100);
    pdf.text(detail.label, detailsX, y);
    pdf.setTextColor(40, 40, 40);
    pdf.text(detail.value, pageWidth - 20, y, { align: 'right' });
  });
  
  return yPosition + (details.length * 5) + 5;
}

function addItemsTable(pdf: jsPDF, data: ReceiptData, pageWidth: number, yPosition: number): number {
  const tableLeft = 20;
  const tableRight = pageWidth - 20;
  const tableWidth = tableRight - tableLeft;
  
  pdf.setFillColor(243, 244, 246);
  pdf.rect(tableLeft, yPosition, tableWidth, 10, 'F');
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(60, 60, 60);
  
  const descCol = tableLeft + 5;
  const qtyCol = tableLeft + tableWidth * 0.55;
  const unitCol = tableLeft + tableWidth * 0.70;
  const amountCol = tableRight - 5;
  
  pdf.text('Description', descCol, yPosition + 7);
  pdf.text('Qty', qtyCol, yPosition + 7);
  pdf.text('Unit Price', unitCol, yPosition + 7);
  pdf.text('Amount', amountCol, yPosition + 7, { align: 'right' });
  
  let y = yPosition + 15;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(40, 40, 40);
  
  data.items.forEach((item) => {
    pdf.text(item.description, descCol, y);
    if (item.quantity !== undefined) {
      pdf.text(item.quantity.toString(), qtyCol, y);
    } else {
      pdf.text('-', qtyCol, y);
    }
    if (item.unitPrice !== undefined) {
      pdf.text(formatCurrency(item.unitPrice, data.currency), unitCol, y);
    } else {
      pdf.text('-', unitCol, y);
    }
    pdf.text(formatCurrency(item.amount, data.currency), amountCol, y, { align: 'right' });
    y += 8;
  });
  
  pdf.setDrawColor(200, 200, 200);
  pdf.line(tableLeft, y, tableRight, y);
  y += 5;
  
  return y;
}

function addTotals(pdf: jsPDF, data: ReceiptData, pageWidth: number, yPosition: number): number {
  const rightAlign = pageWidth - 20;
  const labelX = pageWidth - 70;
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  
  let y = yPosition;
  
  pdf.setTextColor(100, 100, 100);
  pdf.text('Subtotal:', labelX, y);
  pdf.setTextColor(40, 40, 40);
  pdf.text(formatCurrency(data.subtotal, data.currency), rightAlign, y, { align: 'right' });
  y += 6;
  
  if (data.tax !== undefined && data.tax > 0) {
    pdf.setTextColor(100, 100, 100);
    const taxLabel = data.taxRate ? `VAT (${data.taxRate}%):` : 'Tax:';
    pdf.text(taxLabel, labelX, y);
    pdf.setTextColor(40, 40, 40);
    pdf.text(formatCurrency(data.tax, data.currency), rightAlign, y, { align: 'right' });
    y += 6;
  }
  
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(0.5);
  pdf.line(labelX - 5, y, rightAlign, y);
  y += 6;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('TOTAL PAID:', labelX, y);
  pdf.text(formatCurrency(data.total, data.currency), rightAlign, y, { align: 'right' });
  y += 10;
  
  pdf.setFillColor(34, 197, 94);
  pdf.roundedRect(rightAlign - 30, y, 30, 8, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  pdf.text('PAID', rightAlign - 15, y + 5.5, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  return y + 15;
}

function addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number): void {
  const footerY = pageHeight - 25;
  
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, footerY, pageWidth - 20, footerY);
  
  pdf.setFontSize(8);
  pdf.setTextColor(130, 130, 130);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Thank you for your business!', pageWidth / 2, footerY + 6, { align: 'center' });
  pdf.text('For questions about this receipt, contact assessments@humanmetrix.co.uk', pageWidth / 2, footerY + 11, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.text(`Generated: ${new Date().toLocaleDateString('en-GB')} | © ${new Date().getFullYear()} HumanMetrix Ltd`, pageWidth / 2, footerY + 17, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
}

export function generateReceiptPDF(data: ReceiptData): Buffer {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  addHeader(pdf, pageWidth);
  
  let y = 50;
  
  y = Math.max(y, addCompanyDetails(pdf, pageWidth, 50));
  
  y = addReceiptTitle(pdf, data.receiptNumber, y);
  
  const billToY = y;
  y = addBillToSection(pdf, data, y);
  
  addReceiptDetails(pdf, data, pageWidth, billToY);
  
  y = Math.max(y, billToY + 30);
  
  y = addItemsTable(pdf, data, pageWidth, y);
  
  y = addTotals(pdf, data, pageWidth, y);
  
  addFooter(pdf, pageWidth, pageHeight);
  
  return Buffer.from(pdf.output('arraybuffer'));
}

export function generateInvoiceReceiptNumber(prefix: string, partnerId: string, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const shortId = partnerId.slice(-6).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  
  return `${prefix}-${year}${month}${day}-${shortId}-${timestamp}`;
}
