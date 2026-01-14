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
  documentType: 'receipt' | 'invoice';
  receiptNumber: string;
  invoiceNumber?: string;
  date: Date;
  dueDate?: Date;
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
  periodStart?: Date;
  periodEnd?: Date;
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

function addDocumentTitle(pdf: jsPDF, data: ReceiptData, yPosition: number): number {
  const isInvoice = data.documentType === 'invoice';
  const title = isInvoice ? 'INVOICE' : 'RECEIPT';
  const docNumber = isInvoice ? (data.invoiceNumber || data.receiptNumber) : data.receiptNumber;
  
  pdf.setFillColor(30, 58, 138);
  pdf.setDrawColor(30, 58, 138);
  pdf.roundedRect(20, yPosition, 60, 12, 2, 2, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, 50, yPosition + 8.5, { align: 'center' });
  
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`#${docNumber}`, 85, yPosition + 8);
  
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
  const isInvoice = data.documentType === 'invoice';
  
  pdf.setFontSize(9);
  pdf.setTextColor(100, 100, 100);
  pdf.setFont('helvetica', 'normal');
  
  const details: Array<{ label: string; value: string }> = [];
  
  if (isInvoice) {
    details.push({ label: 'Invoice Date:', value: formatDate(data.date) });
    if (data.dueDate) {
      details.push({ label: 'Due Date:', value: formatDate(data.dueDate) });
    }
    if (data.periodStart && data.periodEnd) {
      details.push({ 
        label: 'Billing Period:', 
        value: `${formatDate(data.periodStart)} - ${formatDate(data.periodEnd)}` 
      });
    }
    if (data.paymentDate) {
      details.push({ label: 'Paid Date:', value: formatDate(data.paymentDate) });
    }
  } else {
    details.push({ label: 'Receipt Date:', value: formatDate(data.date) });
    details.push({ label: 'Payment Date:', value: data.paymentDate ? formatDate(data.paymentDate) : formatDate(data.date) });
    
    if (data.paymentMethod) {
      details.push({ label: 'Payment Method:', value: data.paymentMethod });
    }
    
    if (data.transactionId) {
      details.push({ label: 'Transaction ID:', value: data.transactionId });
    }
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

function addFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, documentType: 'receipt' | 'invoice'): void {
  const footerY = pageHeight - 25;
  const isInvoice = documentType === 'invoice';
  
  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, footerY, pageWidth - 20, footerY);
  
  pdf.setFontSize(8);
  pdf.setTextColor(130, 130, 130);
  pdf.setFont('helvetica', 'normal');
  
  pdf.text('Thank you for your business!', pageWidth / 2, footerY + 6, { align: 'center' });
  const docLabel = isInvoice ? 'invoice' : 'receipt';
  pdf.text(`For questions about this ${docLabel}, contact assessments@humanmetrix.co.uk`, pageWidth / 2, footerY + 11, { align: 'center' });
  
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
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let y = 25;
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECEIPT', leftMargin, y);
  
  try {
    if (HUMANMETRIX_LOGO_BASE64) {
      pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', rightMargin - 45, 8, 45, 45);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('HumanMetrix Ltd', leftMargin, y);
  
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('8 Cygnet Way', leftMargin, y);
  y += 4;
  pdf.text('Northampton, NN4 9BS', leftMargin, y);
  y += 4;
  pdf.text('United Kingdom', leftMargin, y);
  
  y += 15;
  
  const billToX = leftMargin;
  const receiptDetailsX = pageWidth - 80;
  const receiptValuesX = rightMargin;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('BILL TO', billToX, y);
  
  pdf.setTextColor(100, 100, 100);
  pdf.text('RECEIPT #', receiptDetailsX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.receiptNumber, receiptValuesX, y, { align: 'right' });
  
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text(data.companyName || data.partnerName, billToX, y);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('RECEIPT DATE', receiptDetailsX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(data.date), receiptValuesX, y, { align: 'right' });
  
  let billToY = y + 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  
  if (data.billingAddress?.line1) {
    pdf.text(data.billingAddress.line1, billToX, billToY);
    billToY += 4;
  }
  if (data.billingAddress?.line2) {
    pdf.text(data.billingAddress.line2, billToX, billToY);
    billToY += 4;
  }
  const cityPostcode = [data.billingAddress?.city, data.billingAddress?.postcode].filter(Boolean).join(', ');
  if (cityPostcode) {
    pdf.text(cityPostcode, billToX, billToY);
    billToY += 4;
  }
  if (data.billingAddress?.country) {
    pdf.text(data.billingAddress.country, billToX, billToY);
    billToY += 4;
  }
  
  y += 6;
  if (data.paymentMethod) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('PAYMENT METHOD', receiptDetailsX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.paymentMethod, receiptValuesX, y, { align: 'right' });
    y += 6;
  }
  
  if (data.paymentDate) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('PAYMENT DATE', receiptDetailsX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(data.paymentDate), receiptValuesX, y, { align: 'right' });
    y += 6;
  }
  
  if (data.transactionId) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('TRANSACTION ID', receiptDetailsX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    const shortTxId = data.transactionId.length > 20 ? data.transactionId.slice(0, 20) + '...' : data.transactionId;
    pdf.text(shortTxId, receiptValuesX, y, { align: 'right' });
  }
  
  y = Math.max(billToY + 8, y + 15);
  
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(0.8);
  pdf.line(leftMargin, y, rightMargin, y);
  
  y += 8;
  
  const colQty = leftMargin;
  const colDesc = leftMargin + 20;
  const colUnitPrice = pageWidth - 65;
  const colAmount = rightMargin;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('QTY', colQty, y);
  pdf.text('DESCRIPTION', colDesc, y);
  pdf.text('UNIT PRICE', colUnitPrice, y, { align: 'right' });
  pdf.text('AMOUNT', colAmount, y, { align: 'right' });
  
  y += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(leftMargin, y, rightMargin, y);
  
  y += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  
  for (const item of data.items) {
    const qty = item.quantity !== undefined ? item.quantity.toString() : '';
    pdf.text(qty, colQty, y);
    pdf.text(item.description, colDesc, y);
    
    if (item.unitPrice !== undefined) {
      pdf.text(formatCurrency(item.unitPrice, data.currency), colUnitPrice, y, { align: 'right' });
    }
    pdf.text(formatCurrency(item.amount, data.currency), colAmount, y, { align: 'right' });
    
    y += 8;
  }
  
  y += 10;
  
  const totalsLabelX = pageWidth - 70;
  const totalsValueX = rightMargin;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Subtotal', totalsLabelX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.text(formatCurrency(data.subtotal, data.currency), totalsValueX, y, { align: 'right' });
  
  y += 6;
  
  if (data.tax !== undefined && data.tax > 0) {
    pdf.setTextColor(100, 100, 100);
    const taxLabel = data.taxRate ? `VAT (${data.taxRate}%)` : 'VAT';
    pdf.text(taxLabel, totalsLabelX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.text(formatCurrency(data.tax, data.currency), totalsValueX, y, { align: 'right' });
    y += 6;
  }
  
  y += 2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 41, 59);
  pdf.text('TOTAL', totalsLabelX, y);
  pdf.text(formatCurrency(data.total, data.currency), totalsValueX, y, { align: 'right' });
  
  // Signature section
  const signatureY = y + 20;
  pdf.setFontSize(22);
  pdf.setFont('times', 'italic');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Oskar Greda', rightMargin - 10, signatureY, { align: 'right' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Founder & CEO', rightMargin - 10, signatureY + 6, { align: 'right' });
  
  const footerY = pageHeight - 35;
  
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(2);
  pdf.line(leftMargin, footerY, rightMargin, footerY);
  
  pdf.setFontSize(24);
  pdf.setFont('times', 'bolditalic');
  pdf.setTextColor(30, 58, 138);
  pdf.text('Thank you', leftMargin, footerY + 12);
  
  const termsX = leftMargin + 55;
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(0.5);
  pdf.line(termsX, footerY + 3, termsX, footerY + 20);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('PAYMENT CONFIRMED', termsX + 5, footerY + 7);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('This receipt confirms payment has been received.', termsX + 5, footerY + 13);
  pdf.text('Thank you for your business.', termsX + 5, footerY + 18);
  
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text('assessments@humanmetrix.co.uk | www.humanmetrix.co.uk', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
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

export function generateInvoicePDF(data: ReceiptData): Buffer {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const leftMargin = 20;
  const rightMargin = pageWidth - 20;
  
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  let y = 25;
  
  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(36);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INVOICE', leftMargin, y);
  
  try {
    if (HUMANMETRIX_LOGO_BASE64) {
      pdf.addImage(HUMANMETRIX_LOGO_BASE64, 'PNG', rightMargin - 45, 8, 45, 45);
    }
  } catch (error) {
    console.error('Error adding logo to PDF:', error);
  }
  
  y += 8;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('HumanMetrix Ltd', leftMargin, y);
  
  y += 5;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('8 Cygnet Way', leftMargin, y);
  y += 4;
  pdf.text('Northampton, NN4 9BS', leftMargin, y);
  y += 4;
  pdf.text('United Kingdom', leftMargin, y);
  
  y += 15;
  
  const billToX = leftMargin;
  const invoiceDetailsX = pageWidth - 80;
  const invoiceValuesX = rightMargin;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('BILL TO', billToX, y);
  
  pdf.setTextColor(100, 100, 100);
  pdf.text('INVOICE #', invoiceDetailsX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.invoiceNumber || data.receiptNumber, invoiceValuesX, y, { align: 'right' });
  
  y += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text(data.companyName || data.partnerName, billToX, y);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 100, 100);
  pdf.text('INVOICE DATE', invoiceDetailsX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.setFont('helvetica', 'normal');
  pdf.text(formatDate(data.date), invoiceValuesX, y, { align: 'right' });
  
  let billToY = y + 5;
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  
  if (data.billingAddress?.line1) {
    pdf.text(data.billingAddress.line1, billToX, billToY);
    billToY += 4;
  }
  if (data.billingAddress?.line2) {
    pdf.text(data.billingAddress.line2, billToX, billToY);
    billToY += 4;
  }
  const cityPostcode = [data.billingAddress?.city, data.billingAddress?.postcode].filter(Boolean).join(', ');
  if (cityPostcode) {
    pdf.text(cityPostcode, billToX, billToY);
    billToY += 4;
  }
  if (data.billingAddress?.country) {
    pdf.text(data.billingAddress.country, billToX, billToY);
    billToY += 4;
  }
  
  y += 6;
  if (data.periodStart && data.periodEnd) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('BILLING PERIOD', invoiceDetailsX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    const periodStr = `${new Date(data.periodStart).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${new Date(data.periodEnd).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    pdf.text(periodStr, invoiceValuesX, y, { align: 'right' });
    y += 6;
  }
  
  if (data.dueDate) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(100, 100, 100);
    pdf.text('DUE DATE', invoiceDetailsX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(data.dueDate), invoiceValuesX, y, { align: 'right' });
    y += 6;
  }
  
  if (data.paymentDate) {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(34, 139, 34);
    pdf.text('PAID', invoiceDetailsX, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(formatDate(data.paymentDate), invoiceValuesX, y, { align: 'right' });
  }
  
  y = Math.max(billToY + 8, y + 15);
  
  pdf.setDrawColor(30, 41, 59);
  pdf.setLineWidth(0.8);
  pdf.line(leftMargin, y, rightMargin, y);
  
  y += 8;
  
  const colQty = leftMargin;
  const colDesc = leftMargin + 20;
  const colUnitPrice = pageWidth - 65;
  const colAmount = rightMargin;
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 41, 59);
  pdf.text('QTY', colQty, y);
  pdf.text('DESCRIPTION', colDesc, y);
  pdf.text('UNIT PRICE', colUnitPrice, y, { align: 'right' });
  pdf.text('AMOUNT', colAmount, y, { align: 'right' });
  
  y += 3;
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(leftMargin, y, rightMargin, y);
  
  y += 8;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(60, 60, 60);
  
  for (const item of data.items) {
    const qty = item.quantity !== undefined ? item.quantity.toString() : '';
    pdf.text(qty, colQty, y);
    pdf.text(item.description, colDesc, y);
    
    if (item.unitPrice !== undefined) {
      pdf.text(formatCurrency(item.unitPrice, data.currency), colUnitPrice, y, { align: 'right' });
    }
    pdf.text(formatCurrency(item.amount, data.currency), colAmount, y, { align: 'right' });
    
    y += 8;
  }
  
  y += 10;
  
  const totalsLabelX = pageWidth - 70;
  const totalsValueX = rightMargin;
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Subtotal', totalsLabelX, y);
  pdf.setTextColor(30, 41, 59);
  pdf.text(formatCurrency(data.subtotal, data.currency), totalsValueX, y, { align: 'right' });
  
  y += 6;
  
  if (data.tax !== undefined && data.tax > 0) {
    pdf.setTextColor(100, 100, 100);
    const taxLabel = data.taxRate ? `VAT (${data.taxRate}%)` : 'VAT';
    pdf.text(taxLabel, totalsLabelX, y);
    pdf.setTextColor(30, 41, 59);
    pdf.text(formatCurrency(data.tax, data.currency), totalsValueX, y, { align: 'right' });
    y += 6;
  }
  
  y += 2;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setTextColor(30, 41, 59);
  pdf.text('TOTAL', totalsLabelX, y);
  pdf.text(formatCurrency(data.total, data.currency), totalsValueX, y, { align: 'right' });
  
  // Signature section
  const signatureY = y + 20;
  pdf.setFontSize(22);
  pdf.setFont('times', 'italic');
  pdf.setTextColor(30, 41, 59);
  pdf.text('Oskar Greda', rightMargin - 10, signatureY, { align: 'right' });
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Founder & CEO', rightMargin - 10, signatureY + 6, { align: 'right' });
  
  const footerY = pageHeight - 35;
  
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(2);
  pdf.line(leftMargin, footerY, rightMargin, footerY);
  
  pdf.setFontSize(24);
  pdf.setFont('times', 'bolditalic');
  pdf.setTextColor(30, 58, 138);
  pdf.text('Thank you', leftMargin, footerY + 12);
  
  const termsX = leftMargin + 55;
  pdf.setDrawColor(30, 58, 138);
  pdf.setLineWidth(0.5);
  pdf.line(termsX, footerY + 3, termsX, footerY + 20);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(30, 58, 138);
  pdf.text('TERMS & CONDITIONS', termsX + 5, footerY + 7);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('Payment is due within 30 days of invoice date.', termsX + 5, footerY + 13);
  pdf.text('Please reference invoice number with payment.', termsX + 5, footerY + 18);
  
  pdf.setFontSize(7);
  pdf.setTextColor(150, 150, 150);
  pdf.text('assessments@humanmetrix.co.uk | www.humanmetrix.co.uk', pageWidth / 2, pageHeight - 10, { align: 'center' });
  
  return Buffer.from(pdf.output('arraybuffer'));
}
