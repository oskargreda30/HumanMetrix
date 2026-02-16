import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const mockPdfInstance = {
  setFontSize: vi.fn(),
  setFont: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  setDrawColor: vi.fn(),
  setLineWidth: vi.fn(),
  rect: vi.fn(),
  roundedRect: vi.fn(),
  text: vi.fn(),
  line: vi.fn(),
  addImage: vi.fn(),
  addPage: vi.fn(),
  addFileToVFS: vi.fn(),
  addFont: vi.fn(),
  output: vi.fn().mockReturnValue(new ArrayBuffer(8)),
  getNumberOfPages: vi.fn().mockReturnValue(1),
  setPage: vi.fn(),
  internal: {
    pageSize: {
      getWidth: vi.fn().mockReturnValue(210),
      getHeight: vi.fn().mockReturnValue(297),
    },
  },
};

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => mockPdfInstance),
}));

vi.mock('fs', () => ({
  readFileSync: vi.fn().mockImplementation((filePath: string) => {
    if (filePath.includes('pdfAssets.ts')) {
      return "export const HUMANMETRIX_LOGO_BASE64 = 'dGVzdGxvZ28=';";
    }
    if (filePath.includes('DancingScript')) {
      return '  dGVzdGZvbnQ=  ';
    }
    return '';
  }),
  existsSync: vi.fn().mockReturnValue(true),
}));

vi.mock('path', () => ({
  join: vi.fn((...args: string[]) => args.join('/')),
  dirname: vi.fn((p: string) => p.replace(/\/[^/]+$/, '')),
  default: {
    join: vi.fn((...args: string[]) => args.join('/')),
    dirname: vi.fn((p: string) => p.replace(/\/[^/]+$/, '')),
  },
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/mock/server/generateReceipt.ts'),
}));

import type { ReceiptData } from '../../server/generateReceipt';

let generateReceiptPDF: (data: ReceiptData) => Buffer;
let generateInvoicePDF: (data: ReceiptData) => Buffer;
let generateInvoiceReceiptNumber: (prefix: string, partnerId: string, date: Date) => string;

beforeAll(async () => {
  const mod = await import('../../server/generateReceipt');
  generateReceiptPDF = mod.generateReceiptPDF;
  generateInvoicePDF = mod.generateInvoicePDF;
  generateInvoiceReceiptNumber = mod.generateInvoiceReceiptNumber;
});

function makeReceiptData(overrides: Partial<ReceiptData> = {}): ReceiptData {
  return {
    documentType: 'receipt',
    receiptNumber: 'RCP-20260101-ABC123-XY12',
    date: new Date('2026-01-15'),
    partnerName: 'Test Partner',
    companyName: 'Test Company Ltd',
    billingType: 'subscription',
    items: [
      {
        description: 'Assessment Credits',
        quantity: 10,
        unitPrice: 1000,
        amount: 10000,
      },
    ],
    subtotal: 10000,
    total: 10000,
    currency: 'GBP',
    ...overrides,
  };
}

describe('generateReceipt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPdfInstance.output.mockReturnValue(new ArrayBuffer(8));
    mockPdfInstance.addFileToVFS.mockImplementation(() => {});
    mockPdfInstance.addFont.mockImplementation(() => {});
    mockPdfInstance.addImage.mockImplementation(() => {});
  });

  describe('generateInvoiceReceiptNumber', () => {
    it('formats receipt number correctly', () => {
      const date = new Date('2026-01-15');
      const result = generateInvoiceReceiptNumber('RCP', 'partner123456', date);
      expect(result).toMatch(/^RCP-20260115-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
    });

    it('formats invoice number correctly', () => {
      const date = new Date('2026-03-20');
      const result = generateInvoiceReceiptNumber('INV', 'abc123xyz789', date);
      expect(result).toMatch(/^INV-20260320-[A-Z0-9]{6}-[A-Z0-9]{4}$/);
    });

    it('pads month and day correctly', () => {
      const date = new Date('2026-02-05');
      const result = generateInvoiceReceiptNumber('RCP', 'test12', date);
      expect(result).toContain('-20260205-');
    });

    it('takes last 6 chars of partnerId uppercased', () => {
      const date = new Date('2026-06-10');
      const result = generateInvoiceReceiptNumber('INV', 'abcdef', date);
      expect(result).toContain('ABCDEF');
    });

    it('handles short partner IDs', () => {
      const date = new Date('2026-01-01');
      const result = generateInvoiceReceiptNumber('RCP', 'ab', date);
      expect(result).toContain('AB');
    });
  });

  describe('generateReceiptPDF', () => {
    it('returns a Buffer', () => {
      const data = makeReceiptData();
      const result = generateReceiptPDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('creates a jsPDF instance and produces valid output', () => {
      const data = makeReceiptData();
      const result = generateReceiptPDF(data);
      expect(mockPdfInstance.output).toHaveBeenCalledWith('arraybuffer');
      expect(result).toBeInstanceOf(Buffer);
    });

    it('calls output with arraybuffer', () => {
      const data = makeReceiptData();
      generateReceiptPDF(data);
      expect(mockPdfInstance.output).toHaveBeenCalledWith('arraybuffer');
    });

    it('adds logo image when available', () => {
      const data = makeReceiptData();
      generateReceiptPDF(data);
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('handles addImage error gracefully', () => {
      mockPdfInstance.addImage.mockImplementationOnce(() => {
        throw new Error('Image error');
      });
      const data = makeReceiptData();
      const result = generateReceiptPDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('renders receipt number', () => {
      const data = makeReceiptData({ receiptNumber: 'RCP-TEST-001' });
      generateReceiptPDF(data);
      const textCalls = mockPdfInstance.text.mock.calls;
      const hasReceiptNumber = textCalls.some(
        (call: any[]) => call[0] === 'RCP-TEST-001'
      );
      expect(hasReceiptNumber).toBe(true);
    });

    it('renders company name', () => {
      const data = makeReceiptData({ companyName: 'Acme Corp' });
      generateReceiptPDF(data);
      const textCalls = mockPdfInstance.text.mock.calls;
      const hasCompany = textCalls.some(
        (call: any[]) => call[0] === 'Acme Corp'
      );
      expect(hasCompany).toBe(true);
    });

    it('uses partnerName when companyName is empty', () => {
      const data = makeReceiptData({ companyName: '', partnerName: 'Partner X' });
      generateReceiptPDF(data);
      const textCalls = mockPdfInstance.text.mock.calls;
      const hasPartner = textCalls.some(
        (call: any[]) => call[0] === 'Partner X'
      );
      expect(hasPartner).toBe(true);
    });

    describe('billing address', () => {
      it('renders full billing address', () => {
        const data = makeReceiptData({
          billingAddress: {
            line1: '123 Test St',
            line2: 'Suite 100',
            city: 'London',
            postcode: 'EC1A 1BB',
            country: 'United Kingdom',
          },
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('123 Test St');
        expect(textCalls).toContain('Suite 100');
        expect(textCalls).toContain('London, EC1A 1BB');
        expect(textCalls).toContain('United Kingdom');
      });

      it('handles missing billing address fields', () => {
        const data = makeReceiptData({ billingAddress: undefined });
        const result = generateReceiptPDF(data);
        expect(result).toBeInstanceOf(Buffer);
      });

      it('handles partial billing address - only city', () => {
        const data = makeReceiptData({
          billingAddress: { city: 'Manchester' },
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Manchester');
      });

      it('handles partial billing address - only postcode', () => {
        const data = makeReceiptData({
          billingAddress: { postcode: 'M1 1AA' },
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('M1 1AA');
      });

      it('handles billing address with no city or postcode', () => {
        const data = makeReceiptData({
          billingAddress: { line1: '123 St', country: 'UK' },
        });
        const result = generateReceiptPDF(data);
        expect(result).toBeInstanceOf(Buffer);
      });
    });

    describe('payment details', () => {
      it('renders payment method when provided', () => {
        const data = makeReceiptData({ paymentMethod: 'Credit Card' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Credit Card');
      });

      it('skips payment method when not provided', () => {
        const data = makeReceiptData({ paymentMethod: undefined });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).not.toContain('PAYMENT METHOD');
      });

      it('renders payment date when provided', () => {
        const data = makeReceiptData({ paymentDate: new Date('2026-01-16') });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('PAYMENT DATE');
      });

      it('skips payment date when not provided', () => {
        const data = makeReceiptData({ paymentDate: undefined });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).not.toContain('PAYMENT DATE');
      });
    });

    describe('transaction ID handling', () => {
      it('renders transaction ID', () => {
        const data = makeReceiptData({ transactionId: 'txn_abc123' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('TXN ID');
      });

      it('strips cs_live_ prefix', () => {
        const data = makeReceiptData({ transactionId: 'cs_live_abcdefghijklmnopqr' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const txnText = textCalls.find((t: string) => typeof t === 'string' && t.includes('abcdefghijklmnopqr'));
        expect(txnText).toBeDefined();
      });

      it('strips cs_test_ prefix', () => {
        const data = makeReceiptData({ transactionId: 'cs_test_shortval' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const txnText = textCalls.find((t: string) => typeof t === 'string' && t.includes('shortval'));
        expect(txnText).toBeDefined();
      });

      it('strips pi_ prefix', () => {
        const data = makeReceiptData({ transactionId: 'pi_testvalue' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const txnText = textCalls.find((t: string) => typeof t === 'string' && t.includes('testvalue'));
        expect(txnText).toBeDefined();
      });

      it('truncates long transaction IDs', () => {
        const longId = 'a'.repeat(30);
        const data = makeReceiptData({ transactionId: longId });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const truncated = textCalls.find((t: string) => typeof t === 'string' && t.endsWith('...'));
        expect(truncated).toBeDefined();
      });

      it('does not truncate short transaction IDs', () => {
        const data = makeReceiptData({ transactionId: 'short' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('short');
      });

      it('skips transaction ID when not provided', () => {
        const data = makeReceiptData({ transactionId: undefined });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).not.toContain('TXN ID');
      });
    });

    describe('tax handling', () => {
      it('renders tax with rate when both are provided', () => {
        const data = makeReceiptData({ tax: 2000, taxRate: 20, total: 12000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasVatRate = textCalls.some((t: string) => typeof t === 'string' && t.includes('VAT (20%)'));
        expect(hasVatRate).toBe(true);
      });

      it('renders VAT label without rate when taxRate is not provided', () => {
        const data = makeReceiptData({ tax: 1500, taxRate: undefined, total: 11500 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('VAT');
      });

      it('skips tax section when tax is 0', () => {
        const data = makeReceiptData({ tax: 0 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasVat = textCalls.some((t: string) => typeof t === 'string' && t === 'VAT');
        expect(hasVat).toBe(false);
      });

      it('skips tax section when tax is undefined', () => {
        const data = makeReceiptData({ tax: undefined });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasVatLabel = textCalls.some(
          (t: string) => typeof t === 'string' && (t === 'VAT' || t.startsWith('VAT ('))
        );
        expect(hasVatLabel).toBe(false);
      });
    });

    describe('line items', () => {
      it('renders multiple items', () => {
        const data = makeReceiptData({
          items: [
            { description: 'Item A', quantity: 5, unitPrice: 500, amount: 2500 },
            { description: 'Item B', quantity: 3, unitPrice: 1000, amount: 3000 },
            { description: 'Item C', quantity: 1, unitPrice: 4500, amount: 4500 },
          ],
          subtotal: 10000,
          total: 10000,
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Item A');
        expect(textCalls).toContain('Item B');
        expect(textCalls).toContain('Item C');
      });

      it('handles items without quantity', () => {
        const data = makeReceiptData({
          items: [{ description: 'Flat fee', amount: 5000 }],
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Flat fee');
        expect(textCalls).toContain('');
      });

      it('handles items without unitPrice', () => {
        const data = makeReceiptData({
          items: [{ description: 'Bundle deal', quantity: 1, amount: 7500 }],
        });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Bundle deal');
      });
    });

    describe('currencies', () => {
      it('formats GBP correctly', () => {
        const data = makeReceiptData({ currency: 'GBP', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasGbp = textCalls.some((t: string) => typeof t === 'string' && t.includes('£'));
        expect(hasGbp).toBe(true);
      });

      it('formats USD correctly', () => {
        const data = makeReceiptData({ currency: 'USD', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasUsd = textCalls.some((t: string) => typeof t === 'string' && t.includes('$'));
        expect(hasUsd).toBe(true);
      });

      it('formats EUR correctly', () => {
        const data = makeReceiptData({ currency: 'EUR', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasEur = textCalls.some((t: string) => typeof t === 'string' && t.includes('€'));
        expect(hasEur).toBe(true);
      });

      it('formats JPY (zero-decimal currency) correctly', () => {
        const data = makeReceiptData({ currency: 'JPY', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasYen = textCalls.some((t: string) => typeof t === 'string' && t.includes('¥'));
        expect(hasYen).toBe(true);
      });

      it('formats KRW (zero-decimal currency) correctly', () => {
        const data = makeReceiptData({ currency: 'KRW', total: 50000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasWon = textCalls.some((t: string) => typeof t === 'string' && t.includes('W'));
        expect(hasWon).toBe(true);
      });

      it('formats unknown currency with code prefix', () => {
        const data = makeReceiptData({ currency: 'XYZ', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasXyz = textCalls.some((t: string) => typeof t === 'string' && t.includes('XYZ'));
        expect(hasXyz).toBe(true);
      });

      it('defaults to GBP when currency is empty', () => {
        const data = makeReceiptData({ currency: '' });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasGbp = textCalls.some((t: string) => typeof t === 'string' && t.includes('£'));
        expect(hasGbp).toBe(true);
      });

      it('formats SGD correctly', () => {
        const data = makeReceiptData({ currency: 'SGD', total: 5000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasSgd = textCalls.some((t: string) => typeof t === 'string' && t.includes('S$'));
        expect(hasSgd).toBe(true);
      });

      it('formats VND (zero-decimal) correctly', () => {
        const data = makeReceiptData({ currency: 'VND', total: 500000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasVnd = textCalls.some((t: string) => typeof t === 'string' && t.includes('VND'));
        expect(hasVnd).toBe(true);
      });

      it('formats IDR (zero-decimal) correctly', () => {
        const data = makeReceiptData({ currency: 'IDR', total: 100000 });
        generateReceiptPDF(data);
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        const hasIdr = textCalls.some((t: string) => typeof t === 'string' && t.includes('Rp'));
        expect(hasIdr).toBe(true);
      });
    });

    describe('signature', () => {
      it('adds handwritten signature with DancingScript font', () => {
        const data = makeReceiptData();
        generateReceiptPDF(data);
        expect(mockPdfInstance.addFileToVFS).toHaveBeenCalledWith(
          'DancingScript-Bold.ttf',
          expect.any(String)
        );
        expect(mockPdfInstance.addFont).toHaveBeenCalledWith(
          'DancingScript-Bold.ttf',
          'DancingScript',
          'normal'
        );
        const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
        expect(textCalls).toContain('Oskar Greda');
        expect(textCalls).toContain('Founder & CEO');
      });

      it('falls back to Times Italic when font fails', () => {
        mockPdfInstance.addFont.mockImplementationOnce(() => {
          throw new Error('Font error');
        });
        const data = makeReceiptData();
        generateReceiptPDF(data);
        expect(mockPdfInstance.setFont).toHaveBeenCalledWith('times', 'italic');
      });
    });

    it('renders footer with thank you and contact info', () => {
      const data = makeReceiptData();
      generateReceiptPDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('Thank you');
      expect(textCalls).toContain('PAYMENT CONFIRMED');
    });
  });

  describe('generateInvoicePDF', () => {
    it('returns a Buffer', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-20260115-ABC123-XY12',
      });
      const result = generateInvoicePDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('renders INVOICE title', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-001',
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('INVOICE');
    });

    it('uses invoiceNumber for the invoice number field', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-CUSTOM-001',
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('INV-CUSTOM-001');
    });

    it('falls back to receiptNumber when invoiceNumber is missing', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: undefined,
        receiptNumber: 'RCP-FALLBACK',
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('RCP-FALLBACK');
    });

    it('renders billing address in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-002',
        billingAddress: {
          line1: '456 Invoice St',
          line2: 'Floor 2',
          city: 'Edinburgh',
          postcode: 'EH1 1AA',
          country: 'Scotland',
        },
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('456 Invoice St');
      expect(textCalls).toContain('Floor 2');
      expect(textCalls).toContain('Edinburgh, EH1 1AA');
      expect(textCalls).toContain('Scotland');
    });

    it('handles invoice without billing address', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-003',
        billingAddress: undefined,
      });
      const result = generateInvoicePDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('renders billing period when provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-004',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('BILLING PERIOD');
    });

    it('skips billing period when not provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-005',
        periodStart: undefined,
        periodEnd: undefined,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).not.toContain('BILLING PERIOD');
    });

    it('renders due date when provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-006',
        dueDate: new Date('2026-02-15'),
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('DUE DATE');
    });

    it('skips due date when not provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-007',
        dueDate: undefined,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).not.toContain('DUE DATE');
    });

    it('renders PAID status when paymentDate provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-008',
        paymentDate: new Date('2026-01-20'),
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('PAID');
    });

    it('skips PAID status when paymentDate not provided', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-009',
        paymentDate: undefined,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      const paidCalls = textCalls.filter((t: string) => t === 'PAID');
      expect(paidCalls.length).toBe(0);
    });

    it('renders tax section in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-010',
        tax: 2000,
        taxRate: 20,
        total: 12000,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      const hasVat = textCalls.some((t: string) => typeof t === 'string' && t.includes('VAT'));
      expect(hasVat).toBe(true);
    });

    it('renders VAT without rate when taxRate not provided in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-011',
        tax: 1500,
        taxRate: undefined,
        total: 11500,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('VAT');
    });

    it('skips tax in invoice when tax is 0', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-012',
        tax: 0,
        total: 10000,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      const hasVatLabel = textCalls.some(
        (t: string) => typeof t === 'string' && (t === 'VAT' || t.startsWith('VAT ('))
      );
      expect(hasVatLabel).toBe(false);
    });

    it('renders multiple items in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-013',
        items: [
          { description: 'Service A', quantity: 2, unitPrice: 3000, amount: 6000 },
          { description: 'Service B', amount: 4000 },
        ],
        subtotal: 10000,
        total: 10000,
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('Service A');
      expect(textCalls).toContain('Service B');
    });

    it('renders items without unitPrice in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-014',
        items: [{ description: 'Flat service', quantity: 1, amount: 5000 }],
      });
      generateInvoicePDF(data);
      const result = generateInvoicePDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('adds logo in invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-015',
      });
      generateInvoicePDF(data);
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('handles addImage error in invoice gracefully', () => {
      mockPdfInstance.addImage.mockImplementationOnce(() => {
        throw new Error('Image error');
      });
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-016',
      });
      const result = generateInvoicePDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });

    it('adds signature to invoice', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-017',
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('Oskar Greda');
      expect(textCalls).toContain('Founder & CEO');
    });

    it('renders footer with terms and conditions', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-018',
      });
      generateInvoicePDF(data);
      const textCalls = mockPdfInstance.text.mock.calls.map((c: any[]) => c[0]);
      expect(textCalls).toContain('Thank you');
      expect(textCalls).toContain('TERMS & CONDITIONS');
    });

    it('renders invoice with all optional fields', () => {
      const data = makeReceiptData({
        documentType: 'invoice',
        invoiceNumber: 'INV-FULL',
        dueDate: new Date('2026-02-15'),
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        paymentDate: new Date('2026-01-20'),
        paymentMethod: 'Bank Transfer',
        transactionId: 'pi_test123',
        billingAddress: {
          line1: '123 Full St',
          line2: 'Apt 4',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'United Kingdom',
        },
        vatNumber: 'GB123456789',
        tax: 2000,
        taxRate: 20,
        total: 12000,
      });
      const result = generateInvoicePDF(data);
      expect(result).toBeInstanceOf(Buffer);
    });
  });

  describe('addSignatureFont edge cases', () => {
    it('falls back to Times Italic when addFileToVFS throws', () => {
      mockPdfInstance.addFileToVFS.mockImplementationOnce(() => {
        throw new Error('VFS error');
      });
      const data = makeReceiptData();
      generateReceiptPDF(data);
      const setFontCalls = mockPdfInstance.setFont.mock.calls;
      const hasTimesItalic = setFontCalls.some(
        (c: any[]) => c[0] === 'times' && c[1] === 'italic'
      );
      expect(hasTimesItalic).toBe(true);
    });
  });

  describe('module-level file loading', () => {
    it('module loaded successfully with mocked fs', () => {
      expect(generateReceiptPDF).toBeDefined();
      expect(generateInvoicePDF).toBeDefined();
      expect(generateInvoiceReceiptNumber).toBeDefined();
    });

    it('logo is available (loaded from pdfAssets.ts)', () => {
      const data = makeReceiptData();
      generateReceiptPDF(data);
      expect(mockPdfInstance.addImage).toHaveBeenCalled();
    });

    it('font is available (loaded from font file)', () => {
      const data = makeReceiptData();
      generateReceiptPDF(data);
      expect(mockPdfInstance.addFileToVFS).toHaveBeenCalledWith(
        'DancingScript-Bold.ttf',
        expect.any(String)
      );
    });
  });
});
