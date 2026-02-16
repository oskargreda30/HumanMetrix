import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-msg-id' });
const mockSgSend = vi.fn().mockResolvedValue([{ headers: { 'x-message-id': 'sg-msg-id' } }]);

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: mockSgSend,
  },
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}));

const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
vi.mock('../../server/db', () => ({
  db: {
    insert: mockInsert,
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
  },
}));

vi.mock('@shared/schema', () => ({
  emailLogs: { id: 'id' },
  users: { id: 'id' },
  partners: { id: 'id' },
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  sql: vi.fn(),
  inArray: vi.fn(),
}));

vi.mock('../../server/generateReceipt', () => ({
  generateReceiptPDF: vi.fn().mockReturnValue(Buffer.from('fake-pdf')),
  generateInvoiceReceiptNumber: vi.fn().mockReturnValue('RCP-20260101-ABC12345'),
}));

vi.mock('../../server/generateB2BPDF', () => ({
  generateB2BPDF: vi.fn().mockReturnValue(Buffer.from('fake-b2b-pdf')),
}));

vi.mock('../../server/pdfGenerator', () => ({
  generatePDF: vi.fn().mockReturnValue(Buffer.from('fake-gen-pdf')),
}));

vi.mock('../../server/storage', () => ({
  storage: {
    broadcastAdminNotification: vi.fn().mockResolvedValue(undefined),
    getSuperAdminUsers: vi.fn().mockResolvedValue([
      { email: 'admin@test.com', id: '1', name: 'Admin' },
    ]),
  },
}));

const mockFetch = vi.fn().mockResolvedValue({
  json: vi.fn().mockResolvedValue({
    items: [{
      settings: {
        api_key: 'test-sg-api-key',
        from_email: 'test@humanmetrix.co.uk',
      },
    }],
  }),
});

global.fetch = mockFetch as any;

process.env.GMAIL_USER = 'test@gmail.com';
process.env.GMAIL_APP_PASSWORD = 'test-password';
process.env.REPLIT_DOMAINS = 'test.replit.dev';
process.env.REPLIT_CONNECTORS_HOSTNAME = 'connectors.test.com';
process.env.REPL_IDENTITY = 'test-identity';

let emailModule: typeof import('../../server/email');

beforeEach(async () => {
  vi.clearAllMocks();
  mockSgSend.mockResolvedValue([{ headers: { 'x-message-id': 'sg-msg-id' } }]);
  mockSendMail.mockResolvedValue({ messageId: 'gmail-msg-id' });
  mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue([]) });
  mockFetch.mockResolvedValue({
    json: vi.fn().mockResolvedValue({
      items: [{
        settings: {
          api_key: 'test-sg-api-key',
          from_email: 'test@humanmetrix.co.uk',
        },
      }],
    }),
  });

  vi.resetModules();
  emailModule = await import('../../server/email');
});

describe('Email Service - Comprehensive Tests', () => {
  describe('initializeEmailSystem', () => {
    it('should initialize both email providers', async () => {
      const result = await emailModule.initializeEmailSystem();
      expect(result).toBeUndefined();
    });

    it('should not throw if sendgrid fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      await expect(emailModule.initializeEmailSystem()).resolves.not.toThrow();
    });
  });

  describe('retrySendViaGmail', () => {
    it('should send email via Gmail successfully', async () => {
      const result = await emailModule.retrySendViaGmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should log email on success with context', async () => {
      await emailModule.retrySendViaGmail(
        { to: 'user@test.com', subject: 'Test', html: '<p>Test</p>' },
        { recipientType: 'b2c_customer', emailType: 'other' },
      );
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle Gmail failure', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Gmail error'));
      const result = await emailModule.retrySendViaGmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
    });

    it('should handle array recipients', async () => {
      const result = await emailModule.retrySendViaGmail({
        to: ['a@test.com', 'b@test.com'],
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendPartnerEmail', () => {
    it('should send a partner email successfully', async () => {
      const result = await emailModule.sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Partner Notice',
        html: '<p>Hello Partner</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should send with optional text field', async () => {
      const result = await emailModule.sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Partner Notice',
        html: '<p>Hello</p>',
        text: 'Hello',
      });
      expect(result.success).toBe(true);
    });

    it('should pass logContext when provided', async () => {
      await emailModule.sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
        logContext: { recipientType: 'partner', emailType: 'other' },
      });
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle send failure with fallback', async () => {
      mockSgSend.mockRejectedValueOnce(new Error('SG fail'));
      const result = await emailModule.sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendInvitationEmail', () => {
    const mockInvitation = {
      id: 1,
      candidateEmail: 'candidate@test.com',
      candidateName: 'John Doe',
      inviterName: 'Jane Admin',
      assessmentTypes: ['fit', 'ai_readiness'],
      token: 'test-token-123',
      status: 'pending' as const,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      partnerId: null,
      inviterId: 1,
      message: null,
      completedAt: null,
    };

    it('should send invitation email successfully', async () => {
      await expect(
        emailModule.sendInvitationEmail(mockInvitation, 'Jane Admin'),
      ).resolves.not.toThrow();
    });

    it('should send via Gmail when forceGmail is true', async () => {
      await emailModule.sendInvitationEmail(mockInvitation, 'Jane', { forceGmail: true });
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should handle missing candidate name gracefully', async () => {
      const inviteNullName = { ...mockInvitation, candidateName: null };
      await expect(
        emailModule.sendInvitationEmail(inviteNullName as any, 'Jane'),
      ).resolves.not.toThrow();
    });

    it('should format assessment types in email', async () => {
      await emailModule.sendInvitationEmail(mockInvitation, 'Jane Admin');
      expect(mockSgSend).toHaveBeenCalled();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      await expect(
        emailModule.sendPasswordResetEmail('user@test.com', 'John', 'reset-token-abc'),
      ).resolves.not.toThrow();
    });

    it('should include reset URL in email', async () => {
      await emailModule.sendPasswordResetEmail('user@test.com', 'John', 'reset-token-abc');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('reset-token-abc');
    });

    it('should log email with correct type', async () => {
      await emailModule.sendPasswordResetEmail('user@test.com', 'John', 'token');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle transport failure', async () => {
      mockSgSend.mockRejectedValueOnce(new Error('SG fail'));
      await expect(
        emailModule.sendPasswordResetEmail('user@test.com', 'John', 'token'),
      ).resolves.not.toThrow();
    });
  });

  describe('sendWelcomeEmailWithPassword', () => {
    it('should send welcome email with invitation context', async () => {
      await expect(
        emailModule.sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123'),
      ).resolves.not.toThrow();
    });

    it('should send with post_payment context', async () => {
      await emailModule.sendWelcomeEmailWithPassword(
        'user@test.com', 'John', 'TempPass123', undefined, 'post_payment',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('Credentials');
    });

    it('should include auto-login token when provided', async () => {
      await emailModule.sendWelcomeEmailWithPassword(
        'user@test.com', 'John', 'TempPass123', undefined, 'invitation', 'auto-token',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('auto-token');
    });

    it('should include note when provided', async () => {
      await emailModule.sendWelcomeEmailWithPassword(
        'user@test.com', 'John', 'TempPass123', 'Custom note here',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Custom note here');
    });

    it('should throw on complete send failure', async () => {
      mockSgSend.mockRejectedValue(new Error('SG fail'));
      mockSendMail.mockRejectedValue(new Error('Gmail fail'));
      await expect(
        emailModule.sendWelcomeEmailWithPassword('user@test.com', 'John', 'Pass'),
      ).rejects.toThrow();
    });
  });

  describe('sendContactFormEmail', () => {
    it('should send demo request email', async () => {
      await expect(
        emailModule.sendContactFormEmail('John', 'john@test.com', 'ACME', 'Hello', 'demo'),
      ).resolves.not.toThrow();
    });

    it('should send sales inquiry email', async () => {
      await emailModule.sendContactFormEmail('Jane', 'jane@test.com', 'Corp', 'Inquiry', 'sales');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('Sales Inquiry');
    });

    it('should set reply-to as sender email', async () => {
      await emailModule.sendContactFormEmail('John', 'john@test.com', 'ACME', 'Msg', 'demo');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.replyTo).toBe('john@test.com');
    });

    it('should send to hello@humanmetrix.co.uk', async () => {
      await emailModule.sendContactFormEmail('John', 'john@test.com', 'ACME', 'Msg', 'demo');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.to).toBe('hello@humanmetrix.co.uk');
    });
  });

  describe('sendBillingChangeRequestEmail', () => {
    it('should send billing change request', async () => {
      await expect(
        emailModule.sendBillingChangeRequestEmail({
          partnerCompanyName: 'ACME Corp',
          requesterName: 'John',
          requesterEmail: 'john@acme.com',
          currentBillingType: 'prepaid',
          requestedBillingType: 'invoice',
        }),
      ).resolves.not.toThrow();
    });

    it('should include reason when provided', async () => {
      await emailModule.sendBillingChangeRequestEmail({
        partnerCompanyName: 'ACME',
        requesterName: 'John',
        requesterEmail: 'john@acme.com',
        currentBillingType: 'prepaid',
        requestedBillingType: 'invoice',
        reason: 'Need monthly billing',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Need monthly billing');
    });
  });

  describe('sendPaymentReceiptEmail', () => {
    it('should send payment receipt email', async () => {
      await expect(
        emailModule.sendPaymentReceiptEmail(
          'user@test.com', 'John', ['fit', 'aiq'], 2000, 'sess_123', 'gbp',
        ),
      ).resolves.not.toThrow();
    });

    it('should format currency correctly for GBP', async () => {
      await emailModule.sendPaymentReceiptEmail(
        'user@test.com', 'John', ['fit'], 1500, 'sess_123', 'gbp',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('£');
    });

    it('should format currency correctly for USD', async () => {
      await emailModule.sendPaymentReceiptEmail(
        'user@test.com', 'John', ['fit'], 1500, 'sess_123', 'usd',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('$');
    });

    it('should default currency to GBP', async () => {
      await emailModule.sendPaymentReceiptEmail(
        'user@test.com', 'John', ['fit'], 1500, 'sess_123',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('£');
    });

    it('should include session reference', async () => {
      await emailModule.sendPaymentReceiptEmail(
        'user@test.com', 'John', ['fit'], 1500, 'sess_ABCDEFGHIJKL',
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('ABCDEFGHIJKL');
    });
  });

  describe('sendPaymentReceiptWithPdf', () => {
    const pdfDetails = {
      email: 'user@test.com',
      name: 'John Doe',
      items: [{ description: 'FIT Assessment', amount: 2000 }],
      subtotal: 2000,
      total: 2400,
      currency: 'gbp',
      transactionId: 'txn_abc123def456',
    };

    it('should send receipt with PDF attachment', async () => {
      const result = await emailModule.sendPaymentReceiptWithPdf(pdfDetails);
      expect(result.success).toBe(true);
      expect(result.receiptNumber).toBeDefined();
    });

    it('should include PDF attachment in email', async () => {
      await emailModule.sendPaymentReceiptWithPdf(pdfDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.attachments).toHaveLength(1);
      expect(callArgs?.attachments[0]?.type).toBe('application/pdf');
    });

    it('should handle PDF generation failure', async () => {
      const { generateReceiptPDF } = await import('../../server/generateReceipt');
      (generateReceiptPDF as any).mockImplementationOnce(() => {
        throw new Error('PDF generation failed');
      });
      const result = await emailModule.sendPaymentReceiptWithPdf(pdfDetails);
      expect(result.success).toBe(false);
    });

    it('should include company name when provided', async () => {
      const result = await emailModule.sendPaymentReceiptWithPdf({
        ...pdfDetails,
        companyName: 'ACME Corp',
      });
      expect(result.success).toBe(true);
    });

    it('should handle different currencies', async () => {
      const result = await emailModule.sendPaymentReceiptWithPdf({
        ...pdfDetails,
        currency: 'usd',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendPartnerQuotaWarning70', () => {
    it('should send 70% quota warning', async () => {
      await expect(
        emailModule.sendPartnerQuotaWarning70(
          'partner@test.com', 'ACME Corp', 70, 100, 30,
        ),
      ).resolves.not.toThrow();
    });

    it('should include usage percentage', async () => {
      await emailModule.sendPartnerQuotaWarning70('p@test.com', 'ACME', 70, 100, 30);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('70%');
    });

    it('should include company name in subject', async () => {
      await emailModule.sendPartnerQuotaWarning70('p@test.com', 'TestCo', 70, 100, 30);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('TestCo');
    });
  });

  describe('sendPartnerQuotaWarning90', () => {
    it('should send 90% quota warning', async () => {
      await expect(
        emailModule.sendPartnerQuotaWarning90(
          'partner@test.com', 'ACME Corp', 90, 100, 10,
        ),
      ).resolves.not.toThrow();
    });

    it('should include urgency in subject', async () => {
      await emailModule.sendPartnerQuotaWarning90('p@test.com', 'ACME', 90, 100, 10);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('URGENT');
    });
  });

  describe('sendPartnerAccessSuspendedEmail', () => {
    it('should send access suspended email', async () => {
      await expect(
        emailModule.sendPartnerAccessSuspendedEmail(
          'partner@test.com', 'ACME Corp', 100, 100, 0,
        ),
      ).resolves.not.toThrow();
    });

    it('should include company name in email', async () => {
      await emailModule.sendPartnerAccessSuspendedEmail('p@test.com', 'ACME', 100, 100, 0);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('ACME');
    });
  });

  describe('sendPartnerSecurityAlert', () => {
    it('should send security alert', async () => {
      await expect(
        emailModule.sendPartnerSecurityAlert(
          'partner@test.com', 'ACME Corp', 'login_attempt', 'Suspicious login from new IP',
        ),
      ).resolves.not.toThrow();
    });

    it('should include alert type in email', async () => {
      await emailModule.sendPartnerSecurityAlert('p@test.com', 'ACME', 'api_key_leaked', 'Key exposed');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('api_key_leaked');
    });
  });

  describe('sendPartnerMonthlySummary', () => {
    it('should send monthly summary email', async () => {
      await expect(
        emailModule.sendPartnerMonthlySummary(
          'partner@test.com', 'ACME Corp', 'January 2026', 50, 100, 50,
        ),
      ).resolves.not.toThrow();
    });

    it('should include month period in email', async () => {
      await emailModule.sendPartnerMonthlySummary('p@test.com', 'ACME', 'Feb 2026', 50, 100, 50);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Feb 2026');
    });
  });

  describe('sendPartnerAutoTopUpConfirmation', () => {
    it('should send auto top-up confirmation', async () => {
      await expect(
        emailModule.sendPartnerAutoTopUpConfirmation(
          'partner@test.com', 'ACME Corp', 'Premium Pack', 50, 99.99,
        ),
      ).resolves.not.toThrow();
    });

    it('should include package name', async () => {
      await emailModule.sendPartnerAutoTopUpConfirmation('p@test.com', 'ACME', 'Starter', 25, 49.99);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Starter');
    });

    it('should include amount charged', async () => {
      await emailModule.sendPartnerAutoTopUpConfirmation('p@test.com', 'ACME', 'Pkg', 25, 49.99);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('49.99');
    });
  });

  describe('sendPartnerInvoiceEmail', () => {
    const invoiceDetails = {
      invoiceNumber: 'INV-2026-001',
      companyName: 'ACME Corp',
      partnerEmail: 'partner@acme.com',
      periodStart: new Date('2026-01-01'),
      periodEnd: new Date('2026-01-31'),
      testsUsed: 50,
      pricePerTest: 500,
      subtotal: 25000,
      vatRate: 20,
      vatAmount: 5000,
      totalAmount: 30000,
      dueDate: new Date('2026-02-28'),
      paymentTermsDays: 30,
    };

    it('should send partner invoice email', async () => {
      await expect(
        emailModule.sendPartnerInvoiceEmail(invoiceDetails),
      ).resolves.not.toThrow();
    });

    it('should include invoice number', async () => {
      await emailModule.sendPartnerInvoiceEmail(invoiceDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('INV-2026-001');
    });

    it('should include billing address when provided', async () => {
      await emailModule.sendPartnerInvoiceEmail({
        ...invoiceDetails,
        billingAddress: { line1: '123 Main St', city: 'London', postcode: 'SW1A 1AA', country: 'UK' },
      });
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should handle different currencies', async () => {
      await emailModule.sendPartnerInvoiceEmail({
        ...invoiceDetails,
        currency: 'usd',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('$');
    });

    it('should include invoice notes when provided', async () => {
      await emailModule.sendPartnerInvoiceEmail({
        ...invoiceDetails,
        invoiceNotes: 'Payment by bank transfer please',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Payment by bank transfer please');
    });
  });

  describe('sendPartnerWelcomeEmail', () => {
    const welcomeDetails = {
      partnerName: 'John Smith',
      companyName: 'ACME Corp',
      email: 'john@acme.com',
      temporaryPassword: 'TempPass123!',
      billingType: 'prepaid' as const,
    };

    it('should send partner welcome email', async () => {
      const result = await emailModule.sendPartnerWelcomeEmail(welcomeDetails);
      expect(result.success).toBe(true);
    });

    it('should include temporary password', async () => {
      await emailModule.sendPartnerWelcomeEmail(welcomeDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('TempPass123!');
    });

    it('should include billing type description', async () => {
      await emailModule.sendPartnerWelcomeEmail(welcomeDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Prepaid');
    });

    it('should include auto-login link when token provided', async () => {
      const result = await emailModule.sendPartnerWelcomeEmail({
        ...welcomeDetails,
        autoLoginToken: 'auto-login-xyz',
      });
      expect(result.success).toBe(true);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('auto-login-xyz');
    });

    it('should include free tests info when allocated', async () => {
      await emailModule.sendPartnerWelcomeEmail({
        ...welcomeDetails,
        freeTestsAllocated: 10,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('10');
    });

    it('should handle invoice billing type', async () => {
      await emailModule.sendPartnerWelcomeEmail({
        ...welcomeDetails,
        billingType: 'invoice',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Invoice');
    });
  });

  describe('sendGeneralEnquiryEmail', () => {
    it('should send general enquiry email', async () => {
      await expect(
        emailModule.sendGeneralEnquiryEmail({
          name: 'John',
          email: 'john@test.com',
          subject: 'Question',
          message: 'I have a question',
        }),
      ).resolves.not.toThrow();
    });

    it('should send to hello@humanmetrix.co.uk', async () => {
      await emailModule.sendGeneralEnquiryEmail({
        name: 'John',
        email: 'john@test.com',
        subject: 'Question',
        message: 'Hello',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.to).toBe('hello@humanmetrix.co.uk');
    });

    it('should set reply-to as enquirer email', async () => {
      await emailModule.sendGeneralEnquiryEmail({
        name: 'John',
        email: 'john@test.com',
        subject: 'Q',
        message: 'Msg',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.replyTo).toBe('john@test.com');
    });
  });

  describe('sendPartnerBulkInvitationEmail', () => {
    const bulkDetails = {
      candidateEmail: 'candidate@test.com',
      candidateName: 'Test Candidate',
      assessmentTypes: ['fit', 'aiq'],
      inviteToken: 'bulk-token-123',
      partnerCompanyName: 'ACME Corp',
    };

    it('should send bulk invitation email', async () => {
      const result = await emailModule.sendPartnerBulkInvitationEmail(bulkDetails);
      expect(result.success).toBe(true);
    });

    it('should use forceGmail option', async () => {
      const result = await emailModule.sendPartnerBulkInvitationEmail(
        bulkDetails, { forceGmail: true },
      );
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should include partner branding when provided', async () => {
      const result = await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        partnerPrimaryColor: '#ff0000',
        partnerLogoUrl: 'https://example.com/logo.png',
      });
      expect(result.success).toBe(true);
    });

    it('should include custom message when provided', async () => {
      await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        customMessage: 'Please complete by Friday',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Please complete by Friday');
    });

    it('should include temporary password when provided', async () => {
      await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        temporaryPassword: 'TempPass!',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('TempPass!');
    });

    it('should handle resume invitations', async () => {
      await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        isResume: true,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('Continue');
    });

    it('should include expiry date when provided', async () => {
      await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        expiresAt: new Date('2026-12-31'),
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('31 December 2026');
    });

    it('should handle missing candidate name', async () => {
      const result = await emailModule.sendPartnerBulkInvitationEmail({
        ...bulkDetails,
        candidateName: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendB2BCongratulatoryEmail', () => {
    const congratsDetails = {
      email: 'candidate@test.com',
      candidateName: 'John',
      assessmentType: 'fit',
      partnerCompanyName: 'ACME',
      paymentUrl: 'https://test.com/pay',
      paymentAmount: '£15.00',
      freeUnlockDate: new Date('2026-06-01'),
    };

    it('should send congratulatory email', async () => {
      const result = await emailModule.sendB2BCongratulatoryEmail(congratsDetails);
      expect(result.success).toBe(true);
    });

    it('should show discount when original price differs', async () => {
      await emailModule.sendB2BCongratulatoryEmail({
        ...congratsDetails,
        originalPaymentAmount: '£20.00',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('25% off');
    });

    it('should handle missing candidate name', async () => {
      const result = await emailModule.sendB2BCongratulatoryEmail({
        ...congratsDetails,
        candidateName: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should format free unlock date', async () => {
      await emailModule.sendB2BCongratulatoryEmail(congratsDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('1 June 2026');
    });
  });

  describe('sendB2BAllCompleteEmail', () => {
    const allCompleteDetails = {
      email: 'candidate@test.com',
      candidateName: 'John',
      partnerCompanyName: 'ACME',
      completedAssessments: ['fit', 'aiq', 'ai_readiness', 'prompt_architecture'],
      paidAssessments: ['fit'],
      unpaidAssessments: ['aiq', 'ai_readiness', 'prompt_architecture'],
      paymentUrl: 'https://test.com/pay',
      bundlePrice: '£45.00',
      originalTotalPrice: '£60.00',
      discountPercentage: 25,
      freeUnlockDate: new Date('2026-06-01'),
    };

    it('should send all-complete email', async () => {
      const result = await emailModule.sendB2BAllCompleteEmail(allCompleteDetails);
      expect(result.success).toBe(true);
    });

    it('should show bundle discount', async () => {
      await emailModule.sendB2BAllCompleteEmail(allCompleteDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('25%');
    });

    it('should handle no unpaid assessments', async () => {
      const result = await emailModule.sendB2BAllCompleteEmail({
        ...allCompleteDetails,
        unpaidAssessments: [],
        discountPercentage: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendB2BResultsReadyEmail', () => {
    it('should send results ready email', async () => {
      const result = await emailModule.sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        partnerName: 'ACME',
        dashboardUrl: 'https://test.com/dashboard',
      });
      expect(result.success).toBe(true);
    });

    it('should include auto-login token in URL', async () => {
      await emailModule.sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        partnerName: 'ACME',
        dashboardUrl: 'https://test.com/dashboard',
        autoLoginToken: 'auto-xyz',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('auto-xyz');
    });

    it('should handle missing candidate name', async () => {
      const result = await emailModule.sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        partnerName: 'ACME',
        dashboardUrl: 'https://test.com/dashboard',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendB2BResultsEmail', () => {
    it('should send results email with PDF attachment', async () => {
      const result = await emailModule.sendB2BResultsEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        assessmentType: 'fit',
        partnerCompanyName: 'ACME',
        pdfBuffer: Buffer.from('fake-pdf'),
        pdfFilename: 'FIT_Results.pdf',
      });
      expect(result.success).toBe(true);
    });

    it('should include PDF attachment', async () => {
      await emailModule.sendB2BResultsEmail({
        email: 'c@test.com',
        assessmentType: 'fit',
        partnerCompanyName: 'ACME',
        pdfBuffer: Buffer.from('pdf'),
        pdfFilename: 'Results.pdf',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.attachments).toHaveLength(1);
    });

    it('should format assessment name', async () => {
      await emailModule.sendB2BResultsEmail({
        email: 'c@test.com',
        assessmentType: 'ai_readiness',
        partnerCompanyName: 'ACME',
        pdfBuffer: Buffer.from('pdf'),
        pdfFilename: 'Results.pdf',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('AI Readiness Assessment');
    });
  });

  describe('sendB2BResultsEmailWithDownloadLink', () => {
    it('should send results email with download link', async () => {
      const result = await emailModule.sendB2BResultsEmailWithDownloadLink({
        email: 'candidate@test.com',
        assessmentType: 'fit',
        partnerCompanyName: 'ACME',
        downloadUrl: 'https://storage.test.com/result.pdf',
        expiryDays: 7,
      });
      expect(result.success).toBe(true);
    });

    it('should include download URL', async () => {
      await emailModule.sendB2BResultsEmailWithDownloadLink({
        email: 'c@test.com',
        assessmentType: 'fit',
        partnerCompanyName: 'ACME',
        downloadUrl: 'https://storage.test.com/download/xyz',
        expiryDays: 7,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('https://storage.test.com/download/xyz');
    });

    it('should show expiry days', async () => {
      await emailModule.sendB2BResultsEmailWithDownloadLink({
        email: 'c@test.com',
        assessmentType: 'fit',
        partnerCompanyName: 'ACME',
        downloadUrl: 'https://test.com/dl',
        expiryDays: 14,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('14 days');
    });
  });

  describe('sendB2BResultsEmailWithMultiplePDFs', () => {
    it('should send email with multiple PDF attachments', async () => {
      const result = await emailModule.sendB2BResultsEmailWithMultiplePDFs({
        email: 'candidate@test.com',
        assessmentLabel: '2 Assessments',
        partnerCompanyName: 'ACME',
        resultsUrl: 'https://test.com/results',
        pdfAttachments: [
          { filename: 'FIT_Results.pdf', content: Buffer.from('pdf1') },
          { filename: 'AIQ_Results.pdf', content: Buffer.from('pdf2') },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should attach all PDFs', async () => {
      await emailModule.sendB2BResultsEmailWithMultiplePDFs({
        email: 'c@test.com',
        assessmentLabel: '3 Assessments',
        partnerCompanyName: 'ACME',
        resultsUrl: 'https://test.com/results',
        pdfAttachments: [
          { filename: 'A.pdf', content: Buffer.from('a') },
          { filename: 'B.pdf', content: Buffer.from('b') },
          { filename: 'C.pdf', content: Buffer.from('c') },
        ],
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.attachments).toHaveLength(3);
    });

    it('should include receipt details when provided', async () => {
      await emailModule.sendB2BResultsEmailWithMultiplePDFs({
        email: 'c@test.com',
        assessmentLabel: 'FIT',
        partnerCompanyName: 'ACME',
        resultsUrl: 'https://test.com/results',
        pdfAttachments: [{ filename: 'A.pdf', content: Buffer.from('a') }],
        receiptDetails: {
          amount: 2000,
          currency: 'GBP',
          transactionId: 'txn_123',
          purchaseDate: new Date('2026-01-15'),
        },
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Payment Receipt');
    });
  });

  describe('sendBundleResultsEmail', () => {
    it('should send bundle results email', async () => {
      const result = await emailModule.sendBundleResultsEmail({
        email: 'user@test.com',
        partnerCompanyName: 'ACME',
        attachments: [
          { filename: 'FIT.pdf', buffer: Buffer.from('fit'), assessmentType: 'fit' },
          { filename: 'AIQ.pdf', buffer: Buffer.from('aiq'), assessmentType: 'aiq' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should include all attachment filenames in email', async () => {
      await emailModule.sendBundleResultsEmail({
        email: 'user@test.com',
        partnerCompanyName: 'ACME',
        attachments: [
          { filename: 'FIT_Report.pdf', buffer: Buffer.from('fit'), assessmentType: 'fit' },
        ],
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('FIT_Report.pdf');
    });
  });

  describe('sendPartnerTeamInvitationEmail', () => {
    const teamInviteDetails = {
      email: 'newmember@test.com',
      inviteeName: 'Alice',
      inviterName: 'Bob',
      companyName: 'ACME Corp',
      inviteToken: 'team-token-abc',
      role: 'admin',
    };

    it('should send team invitation email', async () => {
      const result = await emailModule.sendPartnerTeamInvitationEmail(teamInviteDetails);
      expect(result.success).toBe(true);
    });

    it('should display admin role', async () => {
      await emailModule.sendPartnerTeamInvitationEmail(teamInviteDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Administrator');
    });

    it('should display member role', async () => {
      await emailModule.sendPartnerTeamInvitationEmail({
        ...teamInviteDetails,
        role: 'member',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Team Member');
    });

    it('should display viewer role', async () => {
      await emailModule.sendPartnerTeamInvitationEmail({
        ...teamInviteDetails,
        role: 'viewer',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Viewer');
    });

    it('should handle missing invitee name', async () => {
      const result = await emailModule.sendPartnerTeamInvitationEmail({
        ...teamInviteDetails,
        inviteeName: undefined,
      });
      expect(result.success).toBe(true);
    });

    it('should include invite accept URL', async () => {
      await emailModule.sendPartnerTeamInvitationEmail(teamInviteDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('team-token-abc');
    });
  });

  describe('sendPartnerTeamCredentialsEmail', () => {
    const credDetails = {
      email: 'member@test.com',
      name: 'Alice',
      companyName: 'ACME',
      role: 'member',
      temporaryPassword: 'Temp123!',
    };

    it('should send team credentials email', async () => {
      const result = await emailModule.sendPartnerTeamCredentialsEmail(credDetails);
      expect(result.success).toBe(true);
    });

    it('should include temporary password', async () => {
      await emailModule.sendPartnerTeamCredentialsEmail(credDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Temp123!');
    });

    it('should include auto-login link when token provided', async () => {
      await emailModule.sendPartnerTeamCredentialsEmail({
        ...credDetails,
        autoLoginToken: 'auto-abc',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('auto-abc');
    });

    it('should handle missing name', async () => {
      const result = await emailModule.sendPartnerTeamCredentialsEmail({
        ...credDetails,
        name: undefined,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendB2BResultsUnlockedEmail', () => {
    it('should send results unlocked email', async () => {
      const result = await emailModule.sendB2BResultsUnlockedEmail(
        'user@test.com', 'fit', 'ACME', 'https://test.com/results',
      );
      expect(result.success).toBe(true);
    });

    it('should include receipt details when provided', async () => {
      await emailModule.sendB2BResultsUnlockedEmail(
        'user@test.com', 'fit', 'ACME', 'https://test.com/results',
        {
          amount: 1500,
          currency: 'GBP',
          assessmentTypes: ['fit'],
          transactionId: 'txn_123',
          purchaseDate: new Date('2026-01-15'),
        },
      );
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Payment Receipt');
    });

    it('should handle missing receipt details', async () => {
      const result = await emailModule.sendB2BResultsUnlockedEmail(
        'user@test.com', 'aiq', 'Corp', 'https://test.com/results',
      );
      expect(result.success).toBe(true);
    });
  });

  describe('sendResultsReadyEmail', () => {
    const resultsDetails = {
      email: 'user@test.com',
      candidateName: 'John',
      assessmentTypes: ['fit', 'aiq'],
      partnerCompanyName: 'ACME',
      hasExistingAccount: true,
    };

    it('should send results ready email for existing account', async () => {
      const result = await emailModule.sendResultsReadyEmail(resultsDetails);
      expect(result.success).toBe(true);
    });

    it('should send results ready email for new account', async () => {
      const result = await emailModule.sendResultsReadyEmail({
        ...resultsDetails,
        hasExistingAccount: false,
      });
      expect(result.success).toBe(true);
    });

    it('should include auto-login token when provided', async () => {
      await emailModule.sendResultsReadyEmail({
        ...resultsDetails,
        autoLoginToken: 'auto-abc',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('auto-abc');
    });

    it('should include partner invitation ID in URL', async () => {
      await emailModule.sendResultsReadyEmail({
        ...resultsDetails,
        partnerInvitationId: 'inv-123',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('inv-123');
    });

    it('should handle purchaseId redirect', async () => {
      await emailModule.sendResultsReadyEmail({
        ...resultsDetails,
        purchaseId: 'pur-456',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('pur-456');
    });

    it('should show "Create Account" CTA for new users', async () => {
      await emailModule.sendResultsReadyEmail({
        ...resultsDetails,
        hasExistingAccount: false,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Create Account');
    });
  });

  describe('sendEmailVerificationCode', () => {
    it('should send verification code email', async () => {
      const result = await emailModule.sendEmailVerificationCode(
        'user@test.com', '123456',
      );
      expect(result).toEqual({ success: true, messageId: 'sg-msg-id' });
    });

    it('should include verification code in email', async () => {
      await emailModule.sendEmailVerificationCode('user@test.com', '654321');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('654321');
    });

    it('should include code in subject', async () => {
      await emailModule.sendEmailVerificationCode('user@test.com', '111222');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('111222');
    });

    it('should include partner name when provided', async () => {
      await emailModule.sendEmailVerificationCode('user@test.com', '123456', 'ACME Corp');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('ACME Corp');
    });

    it('should handle missing partner name', async () => {
      const result = await emailModule.sendEmailVerificationCode('user@test.com', '123456');
      expect(result.success).toBe(true);
    });
  });

  describe('sendBillingFailureNotification', () => {
    const billingFailure = {
      partnerEmail: 'partner@test.com',
      companyName: 'ACME Corp',
      failureReason: 'card_declined',
      failedAttempts: 1,
      amountDue: 5000,
      currency: 'gbp',
      updatePaymentUrl: 'https://test.com/billing',
    };

    it('should send billing failure notification', async () => {
      const result = await emailModule.sendBillingFailureNotification(billingFailure);
      expect(result.success).toBe(true);
    });

    it('should show warning for first attempt', async () => {
      await emailModule.sendBillingFailureNotification(billingFailure);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('Payment Failed');
    });

    it('should show URGENT for 3+ attempts', async () => {
      await emailModule.sendBillingFailureNotification({
        ...billingFailure,
        failedAttempts: 3,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('URGENT');
    });

    it('should include next retry date when provided', async () => {
      await emailModule.sendBillingFailureNotification({
        ...billingFailure,
        nextRetryDate: new Date('2026-03-01'),
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('1 March 2026');
    });

    it('should handle different failure reasons', async () => {
      await emailModule.sendBillingFailureNotification({
        ...billingFailure,
        failureReason: 'insufficient_funds',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('Insufficient funds');
    });
  });

  describe('sendCardExpiryWarning', () => {
    const expiryDetails = {
      partnerEmail: 'partner@test.com',
      companyName: 'ACME',
      cardLast4: '4242',
      cardBrand: 'visa',
      expiryMonth: 3,
      expiryYear: 2026,
      daysUntilExpiry: 7,
      updatePaymentUrl: 'https://test.com/billing',
    };

    it('should send card expiry warning', async () => {
      const result = await emailModule.sendCardExpiryWarning(expiryDetails);
      expect(result.success).toBe(true);
    });

    it('should show urgent text for 1 day', async () => {
      await emailModule.sendCardExpiryWarning({
        ...expiryDetails,
        daysUntilExpiry: 1,
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('expires tomorrow');
    });

    it('should show days for 7 day warning', async () => {
      await emailModule.sendCardExpiryWarning(expiryDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('7 days');
    });
  });

  describe('notifySuperAdmins', () => {
    it('should send notification to super admins', async () => {
      const result = await emailModule.notifySuperAdmins({
        type: 'test_alert',
        severity: 'info',
        title: 'Test Alert',
        message: 'This is a test',
        emailSubject: 'Test Subject',
        emailHtml: '<p>Test</p>',
      });
      expect(result.emailSent).toBe(true);
      expect(result.notificationCreated).toBe(true);
    });

    it('should handle critical severity', async () => {
      const result = await emailModule.notifySuperAdmins({
        type: 'critical_alert',
        severity: 'critical',
        title: 'Critical Alert',
        message: 'Something broke',
        emailSubject: 'Critical',
        emailHtml: '<p>Critical</p>',
      });
      expect(result.emailSent).toBe(true);
    });

    it('should include metadata when provided', async () => {
      const result = await emailModule.notifySuperAdmins({
        type: 'test',
        severity: 'warning',
        title: 'Warning',
        message: 'Warning msg',
        metadata: { key: 'value' },
        emailSubject: 'Warning',
        emailHtml: '<p>Warning</p>',
      });
      expect(result.notificationCreated).toBe(true);
    });
  });

  describe('sendBillingFailureAdminNotification', () => {
    it('should send admin billing failure notification', async () => {
      const result = await emailModule.sendBillingFailureAdminNotification({
        partnerId: 'p-123',
        companyName: 'ACME',
        partnerEmail: 'p@acme.com',
        failureReason: 'card_declined',
        failedAttempts: 2,
        amountDue: 10000,
        currency: 'gbp',
        billingType: 'auto_bill',
      });
      expect(result.success).toBe(true);
    });

    it('should indicate suspension for 3+ attempts', async () => {
      await emailModule.sendBillingFailureAdminNotification({
        partnerId: 'p-123',
        companyName: 'ACME',
        partnerEmail: 'p@acme.com',
        failureReason: 'card_declined',
        failedAttempts: 3,
        amountDue: 10000,
        currency: 'gbp',
        billingType: 'auto_bill',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('Suspended');
    });
  });

  describe('notifyB2CPaymentFailure', () => {
    it('should notify about B2C payment failure', async () => {
      const result = await emailModule.notifyB2CPaymentFailure({
        userEmail: 'user@test.com',
        amountDue: 2000,
        currency: 'gbp',
        failureReason: 'card_declined',
      });
      expect(result.success).toBe(true);
    });

    it('should include user name when provided', async () => {
      const result = await emailModule.notifyB2CPaymentFailure({
        userEmail: 'user@test.com',
        userName: 'John Doe',
        amountDue: 2000,
        currency: 'gbp',
        failureReason: 'card_declined',
      });
      expect(result.success).toBe(true);
    });

    it('should include assessment type when provided', async () => {
      const result = await emailModule.notifyB2CPaymentFailure({
        userEmail: 'user@test.com',
        amountDue: 2000,
        currency: 'gbp',
        failureReason: 'expired_card',
        assessmentType: 'fit',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('notifyB2BTestTakerPaymentFailure', () => {
    it('should notify about B2B test taker payment failure', async () => {
      const result = await emailModule.notifyB2BTestTakerPaymentFailure({
        candidateEmail: 'candidate@test.com',
        sessionId: 'sess-123',
        assessmentType: 'fit',
        partnerId: 'p-1',
        partnerName: 'ACME',
        amountDue: 1500,
        currency: 'gbp',
        failureReason: 'insufficient_funds',
      });
      expect(result.success).toBe(true);
    });

    it('should include candidate name when provided', async () => {
      const result = await emailModule.notifyB2BTestTakerPaymentFailure({
        candidateEmail: 'c@test.com',
        candidateName: 'Alice',
        sessionId: 'sess-123',
        assessmentType: 'aiq',
        partnerId: 'p-1',
        partnerName: 'ACME',
        amountDue: 1500,
        currency: 'gbp',
        failureReason: 'card_declined',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('notifyB2BInvoiceOverdue', () => {
    it('should notify about overdue invoice', async () => {
      const result = await emailModule.notifyB2BInvoiceOverdue({
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        amountDue: 50000,
        currency: 'gbp',
        dueDate: new Date('2026-01-15'),
        daysOverdue: 15,
      });
      expect(result.success).toBe(true);
    });

    it('should handle critical severity for 30+ days overdue', async () => {
      const result = await emailModule.notifyB2BInvoiceOverdue({
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-2026-001',
        amountDue: 50000,
        currency: 'gbp',
        dueDate: new Date('2025-12-01'),
        daysOverdue: 45,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('notifyInvoiceSuspension', () => {
    const suspensionDetails = {
      partnerId: 'p-1',
      partnerName: 'ACME Corp',
      partnerEmail: 'partner@acme.com',
      invoiceNumber: 'INV-2026-001',
      amountDue: 50000,
      currency: 'gbp',
      dueDate: new Date('2026-01-15'),
      daysOverdue: 35,
      paymentUrl: 'https://test.com/pay',
    };

    it('should send invoice suspension notification', async () => {
      const result = await emailModule.notifyInvoiceSuspension(suspensionDetails);
      expect(result.success).toBe(true);
    });

    it('should include invoice number for invoice-based suspension', async () => {
      await emailModule.notifyInvoiceSuspension(suspensionDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('INV-2026-001');
    });

    it('should handle manual suspension with custom reason', async () => {
      const result = await emailModule.notifyInvoiceSuspension({
        ...suspensionDetails,
        invoiceNumber: 'N/A',
        customReason: 'Suspended for investigation',
      });
      expect(result.success).toBe(true);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toBe('URGENT: API Access Suspended');
    });

    it('should include payment URL', async () => {
      await emailModule.notifyInvoiceSuspension(suspensionDetails);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('https://test.com/pay');
    });
  });

  describe('notifyInvoiceRestoration', () => {
    it('should send invoice restoration notification', async () => {
      const result = await emailModule.notifyInvoiceRestoration({
        partnerId: 'p-1',
        partnerName: 'ACME Corp',
        partnerEmail: 'partner@acme.com',
        dashboardUrl: 'https://test.com/dashboard',
      });
      expect(result.success).toBe(true);
    });

    it('should include partner name', async () => {
      await emailModule.notifyInvoiceRestoration({
        partnerId: 'p-1',
        partnerName: 'ACME Corp',
        partnerEmail: 'p@acme.com',
        dashboardUrl: 'https://test.com/dashboard',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('ACME Corp');
    });

    it('should include dashboard URL', async () => {
      await emailModule.notifyInvoiceRestoration({
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        dashboardUrl: 'https://test.com/my-dashboard',
      });
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('https://test.com/my-dashboard');
    });
  });

  describe('notifyPrepaidLowBalance', () => {
    it('should notify about low prepaid balance', async () => {
      const result = await emailModule.notifyPrepaidLowBalance({
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        currentBalance: 5000,
        currency: 'gbp',
        testsRemaining: 10,
        rechargeUrl: 'https://test.com/recharge',
      });
      expect(result.success).toBe(true);
    });

    it('should handle critical low balance (5 or fewer tests)', async () => {
      const result = await emailModule.notifyPrepaidLowBalance({
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        currentBalance: 1000,
        currency: 'gbp',
        testsRemaining: 2,
        rechargeUrl: 'https://test.com/recharge',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('notifyCriticalError', () => {
    it('should notify about critical error', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'Payment Processing',
        error: new Error('Stripe webhook failed'),
      });
      expect(result.success).toBe(true);
    });

    it('should handle string errors', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'API Gateway',
        error: 'Connection timeout',
      });
      expect(result.success).toBe(true);
    });

    it('should include user ID when provided', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'Scoring Engine',
        error: new Error('Failed'),
        userId: 'user-123',
      });
      expect(result.success).toBe(true);
    });

    it('should include partner ID when provided', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'API',
        error: new Error('Partner API error'),
        partnerId: 'partner-456',
      });
      expect(result.success).toBe(true);
    });

    it('should include request details when provided', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'API Route',
        error: new Error('500 error'),
        requestPath: '/api/assessments',
        requestMethod: 'POST',
      });
      expect(result.success).toBe(true);
    });

    it('should include additional context', async () => {
      const result = await emailModule.notifyCriticalError({
        source: 'Webhook',
        error: new Error('Parse error'),
        additionalContext: { webhookId: 'wh-123', eventType: 'payment.completed' },
      });
      expect(result.success).toBe(true);
    });

    it('should handle notification system failure gracefully', async () => {
      const { storage } = await import('../../server/storage');
      (storage.broadcastAdminNotification as any).mockRejectedValueOnce(new Error('DB fail'));
      (storage.getSuperAdminUsers as any).mockRejectedValueOnce(new Error('DB fail'));

      const result = await emailModule.notifyCriticalError({
        source: 'Test',
        error: 'Test error',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('sendBroadcastEmail', () => {
    it('should send broadcast email successfully', async () => {
      const result = await emailModule.sendBroadcastEmail(
        'user@test.com', 'Announcement', 'Hello everyone!',
      );
      expect(result.success).toBe(true);
    });

    it('should include title in subject', async () => {
      await emailModule.sendBroadcastEmail('user@test.com', 'Big News', 'Content here');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toBe('Big News');
    });

    it('should convert newlines to <br> in HTML', async () => {
      await emailModule.sendBroadcastEmail('user@test.com', 'Title', 'Line 1\nLine 2');
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('<br>');
    });

    it('should handle send failure gracefully', async () => {
      const result = await emailModule.sendBroadcastEmail('user@test.com', 'Title', 'Content');
      expect(result).toHaveProperty('success');
    });
  });

  describe('sendBugReportNotificationEmail', () => {
    const bugReport = {
      bugId: 'bug-123',
      title: 'Button not working',
      description: 'The submit button does not respond',
      severity: 'high',
      reporterName: 'John Doe',
      reporterEmail: 'john@test.com',
    };

    it('should send bug report notification', async () => {
      const result = await emailModule.sendBugReportNotificationEmail(bugReport);
      expect(result.success).toBe(true);
    });

    it('should include severity in subject', async () => {
      await emailModule.sendBugReportNotificationEmail(bugReport);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.subject).toContain('HIGH');
    });

    it('should send to critical error recipients', async () => {
      await emailModule.sendBugReportNotificationEmail(bugReport);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.to).toContain('daena@humanmetrix.co.uk');
    });

    it('should include bug ID', async () => {
      await emailModule.sendBugReportNotificationEmail(bugReport);
      const callArgs = mockSgSend.mock.calls[0]?.[0];
      expect(callArgs?.html).toContain('bug-123');
    });

    it('should handle different severity levels', async () => {
      for (const severity of ['critical', 'high', 'medium', 'low']) {
        vi.clearAllMocks();
        mockSgSend.mockResolvedValue([{ headers: { 'x-message-id': 'sg-msg-id' } }]);
        mockFetch.mockResolvedValue({
          json: vi.fn().mockResolvedValue({
            items: [{ settings: { api_key: 'key', from_email: 'test@humanmetrix.co.uk' } }],
          }),
        });
        await emailModule.sendBugReportNotificationEmail({ ...bugReport, severity });
        const callArgs = mockSgSend.mock.calls[0]?.[0];
        expect(callArgs?.subject).toContain(severity.toUpperCase());
      }
    });

    it('should handle send failure gracefully', async () => {
      const result = await emailModule.sendBugReportNotificationEmail(bugReport);
      expect(result).toHaveProperty('success');
    });
  });

  describe('Email failover behavior', () => {
    it('should fall back to Gmail when SendGrid fails', async () => {
      mockSgSend.mockRejectedValueOnce(new Error('SG down'));
      const result = await emailModule.sendPartnerEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should return failure when both providers fail', async () => {
      mockSgSend.mockRejectedValue(new Error('SG fail'));
      mockSendMail.mockRejectedValue(new Error('Gmail fail'));
      const result = await emailModule.sendPartnerEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Type exports', () => {
    it('should export RecipientType', () => {
      const recipientType: emailModule.RecipientType = 'partner';
      expect(recipientType).toBe('partner');
    });

    it('should export EmailType', () => {
      const emailType: emailModule.EmailType = 'invitation';
      expect(emailType).toBe('invitation');
    });

    it('should export EmailProvider', () => {
      const provider: emailModule.EmailProvider = 'sendgrid';
      expect(provider).toBe('sendgrid');
    });

    it('should export PdfReceiptEmailDetails interface', () => {
      const details: emailModule.PdfReceiptEmailDetails = {
        email: 'test@test.com',
        name: 'Test',
        items: [{ description: 'Item', amount: 100 }],
        subtotal: 100,
        total: 120,
        currency: 'gbp',
        transactionId: 'txn-123',
      };
      expect(details.email).toBe('test@test.com');
    });

    it('should export PartnerWelcomeDetails interface', () => {
      const details: emailModule.PartnerWelcomeDetails = {
        partnerName: 'John',
        companyName: 'ACME',
        email: 'john@acme.com',
        temporaryPassword: 'Pass123',
        billingType: 'prepaid',
      };
      expect(details.billingType).toBe('prepaid');
    });

    it('should export PartnerTeamInvitationDetails interface', () => {
      const details: emailModule.PartnerTeamInvitationDetails = {
        email: 'member@test.com',
        inviterName: 'Admin',
        companyName: 'Corp',
        inviteToken: 'token',
        role: 'admin',
      };
      expect(details.role).toBe('admin');
    });

    it('should export ResultsReadyEmailDetails interface', () => {
      const details: emailModule.ResultsReadyEmailDetails = {
        email: 'user@test.com',
        assessmentTypes: ['fit'],
        partnerCompanyName: 'ACME',
        hasExistingAccount: true,
      };
      expect(details.hasExistingAccount).toBe(true);
    });

    it('should export BillingFailureDetails interface', () => {
      const details: emailModule.BillingFailureDetails = {
        partnerEmail: 'p@test.com',
        companyName: 'ACME',
        failureReason: 'card_declined',
        failedAttempts: 1,
        amountDue: 1000,
        currency: 'gbp',
        updatePaymentUrl: 'https://test.com',
      };
      expect(details.failureReason).toBe('card_declined');
    });

    it('should export CardExpiryWarningDetails interface', () => {
      const details: emailModule.CardExpiryWarningDetails = {
        partnerEmail: 'p@test.com',
        companyName: 'ACME',
        cardLast4: '4242',
        cardBrand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
        daysUntilExpiry: 7,
        updatePaymentUrl: 'https://test.com',
      };
      expect(details.cardLast4).toBe('4242');
    });

    it('should export CriticalErrorDetails interface', () => {
      const details: emailModule.CriticalErrorDetails = {
        source: 'Test',
        error: new Error('Test error'),
      };
      expect(details.source).toBe('Test');
    });

    it('should export InvoiceSuspensionDetails interface', () => {
      const details: emailModule.InvoiceSuspensionDetails = {
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        invoiceNumber: 'INV-001',
        amountDue: 5000,
        currency: 'gbp',
        dueDate: new Date(),
        daysOverdue: 30,
        paymentUrl: 'https://test.com',
      };
      expect(details.partnerId).toBe('p-1');
    });

    it('should export InvoiceRestorationDetails interface', () => {
      const details: emailModule.InvoiceRestorationDetails = {
        partnerId: 'p-1',
        partnerName: 'ACME',
        partnerEmail: 'p@acme.com',
        dashboardUrl: 'https://test.com/dashboard',
      };
      expect(details.dashboardUrl).toBe('https://test.com/dashboard');
    });

    it('should export BillingFailureAdminDetails interface', () => {
      const details: emailModule.BillingFailureAdminDetails = {
        partnerId: 'p-1',
        companyName: 'ACME',
        partnerEmail: 'p@acme.com',
        failureReason: 'card_declined',
        failedAttempts: 1,
        amountDue: 1000,
        currency: 'gbp',
        billingType: 'auto_bill',
      };
      expect(details.billingType).toBe('auto_bill');
    });
  });
});
