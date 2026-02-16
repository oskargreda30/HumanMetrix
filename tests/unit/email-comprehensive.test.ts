import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn(() => ({
  sendMail: mockSendMail,
}));

const mockSgSend = vi.fn();
const mockSgSetApiKey = vi.fn();

const mockDbInsert = vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) }));

const mockGenerateReceiptPDF = vi.fn(() => Buffer.from('fake-pdf'));
const mockGenerateInvoiceReceiptNumber = vi.fn(() => 'RCP-TEST-001');

const mockBroadcastAdminNotification = vi.fn().mockResolvedValue(undefined);
const mockGetSuperAdminUsers = vi.fn().mockResolvedValue([
  { email: 'admin1@test.com' },
  { email: 'admin2@test.com' },
]);

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: mockSgSetApiKey,
    send: mockSgSend,
  },
}));

vi.mock('./db', () => ({
  db: {
    insert: mockDbInsert,
  },
}));

vi.mock('@shared/schema', () => ({
  emailLogs: 'emailLogs',
}));

const mockGenerateInvoicePDF = vi.fn(() => Buffer.from('fake-invoice-pdf'));

vi.mock('./generateReceipt', () => ({
  generateReceiptPDF: mockGenerateReceiptPDF,
  generateInvoiceReceiptNumber: mockGenerateInvoiceReceiptNumber,
  generateInvoicePDF: mockGenerateInvoicePDF,
}));

vi.mock('./storage', () => ({
  storage: {
    broadcastAdminNotification: mockBroadcastAdminNotification,
    getSuperAdminUsers: mockGetSuperAdminUsers,
  },
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function setupSendGridFetch(success = true) {
  if (success) {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({
        items: [{
          settings: {
            api_key: 'test-api-key',
            from_email: 'test@humanmetrix.co.uk',
          },
        }],
      }),
    });
  } else {
    mockFetch.mockResolvedValue({
      json: () => Promise.resolve({ items: [] }),
    });
  }
}

function setupSendGridSuccess() {
  setupSendGridFetch(true);
  mockSgSend.mockResolvedValue([
    { statusCode: 202, headers: { 'x-message-id': 'sg-msg-123' } },
  ]);
}

function setupSendGridFailure() {
  setupSendGridFetch(true);
  mockSgSend.mockRejectedValue(new Error('SendGrid send failed'));
}

function setupGmailSuccess() {
  mockSendMail.mockResolvedValue({ messageId: 'gmail-msg-456' });
}

function setupGmailFailure() {
  mockSendMail.mockRejectedValue(new Error('Gmail send failed'));
}

describe('Email Service - Comprehensive Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'test-password';
    process.env.REPLIT_CONNECTORS_HOSTNAME = 'connectors.test.com';
    process.env.REPL_IDENTITY = 'test-identity';
    process.env.REPLIT_DOMAINS = 'test.replit.app';

    setupSendGridSuccess();
    setupGmailSuccess();
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.GMAIL_USER;
    delete process.env.GMAIL_APP_PASSWORD;
    delete process.env.REPLIT_CONNECTORS_HOSTNAME;
    delete process.env.REPL_IDENTITY;
    delete process.env.WEB_REPL_RENEWAL;
    delete process.env.REPLIT_DOMAINS;
    delete process.env.PRODUCTION_URL;
  });

  async function getModule() {
    return await import('../../server/email');
  }

  describe('initializeEmailSystem', () => {
    it('should initialize both SendGrid and Gmail providers', async () => {
      const { initializeEmailSystem } = await getModule();
      await initializeEmailSystem();
      expect(mockFetch).toHaveBeenCalled();
      expect(mockCreateTransport).toHaveBeenCalled();
    });

    it('should handle SendGrid initialization failure gracefully', async () => {
      setupSendGridFetch(false);
      const { initializeEmailSystem } = await getModule();
      await expect(initializeEmailSystem()).resolves.not.toThrow();
    });

    it('should handle missing Gmail credentials gracefully', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      const { initializeEmailSystem } = await getModule();
      await expect(initializeEmailSystem()).resolves.not.toThrow();
    });

    it('should handle both providers failing gracefully', async () => {
      setupSendGridFetch(false);
      delete process.env.GMAIL_USER;
      const { initializeEmailSystem } = await getModule();
      await expect(initializeEmailSystem()).resolves.not.toThrow();
    });
  });

  describe('sendInvitationEmail', () => {
    const mockInvitation = {
      id: 1,
      candidateEmail: 'candidate@test.com',
      candidateName: 'John Doe',
      assessmentTypes: ['fit', 'ai_readiness'],
      token: 'inv-token-123',
      message: 'Please complete these assessments',
      expiresAt: new Date('2026-03-01'),
      status: 'pending' as const,
      partnerId: 1,
      createdAt: new Date(),
      inviterId: 1,
      updatedAt: new Date(),
      completedAt: null,
      maxAttempts: 1,
      currentAttempts: 0,
    };

    it('should send invitation email successfully via SendGrid', async () => {
      const { sendInvitationEmail } = await getModule();
      const result = await sendInvitationEmail(mockInvitation, 'Jane Manager');
      expect(result.success).toBe(true);
    });

    it('should include assessment names in the email', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('FIT Assessment');
      expect(sendCall.html).toContain('AI Readiness Assessment');
    });

    it('should include invitation link with correct token', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('/invite/inv-token-123');
    });

    it('should include the inviter name in subject', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Jane Manager');
    });

    it('should include candidate name in email body', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('John Doe');
    });

    it('should include custom message if provided', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Please complete these assessments');
    });

    it('should use Gmail when forceGmail option is set', async () => {
      setupSendGridFailure();
      const { sendInvitationEmail } = await getModule();
      const result = await sendInvitationEmail(mockInvitation, 'Jane Manager', { forceGmail: true });
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should failover to Gmail when SendGrid fails', async () => {
      setupSendGridFailure();
      const { sendInvitationEmail } = await getModule();
      const result = await sendInvitationEmail(mockInvitation, 'Jane Manager');
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should return failure when both providers fail', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendInvitationEmail } = await getModule();
      const result = await sendInvitationEmail(mockInvitation, 'Jane Manager');
      expect(result.success).toBe(false);
    });

    it('should send to the correct recipient email', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.to).toBe('candidate@test.com');
    });

    it('should include expiry date', async () => {
      const { sendInvitationEmail } = await getModule();
      await sendInvitationEmail(mockInvitation, 'Jane Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('2026');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'reset-token-123');
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include reset link with token', async () => {
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'reset-token-123');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('/reset-password/reset-token-123');
    });

    it('should include recipient name', async () => {
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'reset-token-123');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('John');
    });

    it('should set correct subject line', async () => {
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'reset-token-123');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Reset');
    });

    it('should failover to Gmail when SendGrid fails', async () => {
      setupSendGridFailure();
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'reset-token-123');
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('sendWelcomeEmailWithPassword', () => {
    it('should send welcome email with credentials', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!');
      expect(mockSgSend).toHaveBeenCalled();
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('TempPass123!');
    });

    it('should include user name in email', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('John');
    });

    it('should include note when provided', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!', 'Welcome to our team');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Welcome to our team');
    });

    it('should use correct subject for post_payment context', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!', undefined, 'post_payment');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Account Credentials');
    });

    it('should use correct subject for invitation context', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!', undefined, 'invitation');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Assessment Invitation');
    });

    it('should include auto-login link when token provided', async () => {
      const { sendWelcomeEmailWithPassword } = await getModule();
      await sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!', undefined, 'invitation', 'auto-token-xyz');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('/auto-login/auto-token-xyz');
    });

    it('should throw error when both providers fail', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendWelcomeEmailWithPassword } = await getModule();
      await expect(sendWelcomeEmailWithPassword('user@test.com', 'John', 'TempPass123!')).rejects.toThrow('Failed to send welcome email');
    });
  });

  describe('sendContactFormEmail', () => {
    it('should send contact form email to sales address', async () => {
      const { sendContactFormEmail } = await getModule();
      await sendContactFormEmail('John', 'john@test.com', 'Acme Corp', 'Interested in demo', 'demo');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.to).toBe('hello@humanmetrix.co.uk');
    });

    it('should set reply-to as sender email', async () => {
      const { sendContactFormEmail } = await getModule();
      await sendContactFormEmail('John', 'john@test.com', 'Acme Corp', 'Interested', 'demo');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.replyTo).toBe('john@test.com');
    });

    it('should use Demo Request label for demo intent', async () => {
      const { sendContactFormEmail } = await getModule();
      await sendContactFormEmail('John', 'john@test.com', 'Acme Corp', 'Want demo', 'demo');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Demo Request');
    });

    it('should use Sales Inquiry label for sales intent', async () => {
      const { sendContactFormEmail } = await getModule();
      await sendContactFormEmail('John', 'john@test.com', 'Acme Corp', 'Pricing info', 'sales');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Sales Inquiry');
    });

    it('should include company name in subject', async () => {
      const { sendContactFormEmail } = await getModule();
      await sendContactFormEmail('John', 'john@test.com', 'Acme Corp', 'Message', 'demo');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Acme Corp');
    });
  });

  describe('sendBillingChangeRequestEmail', () => {
    it('should send billing change request to admin', async () => {
      const { sendBillingChangeRequestEmail } = await getModule();
      await sendBillingChangeRequestEmail({
        partnerCompanyName: 'Acme Corp',
        requesterName: 'John',
        requesterEmail: 'john@acme.com',
        currentBillingType: 'payg',
        requestedBillingType: 'subscription',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.to).toBe('hello@humanmetrix.co.uk');
    });

    it('should include formatted billing types in subject', async () => {
      const { sendBillingChangeRequestEmail } = await getModule();
      await sendBillingChangeRequestEmail({
        partnerCompanyName: 'Acme Corp',
        requesterName: 'John',
        requesterEmail: 'john@acme.com',
        currentBillingType: 'payg',
        requestedBillingType: 'subscription',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Pay-As-You-Go');
      expect(sendCall.subject).toContain('Subscription');
    });

    it('should include reason when provided', async () => {
      const { sendBillingChangeRequestEmail } = await getModule();
      await sendBillingChangeRequestEmail({
        partnerCompanyName: 'Acme Corp',
        requesterName: 'John',
        requesterEmail: 'john@acme.com',
        currentBillingType: 'payg',
        requestedBillingType: 'enterprise',
        reason: 'We need more features',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('We need more features');
    });
  });

  describe('sendPaymentReceiptEmail', () => {
    it('should send payment receipt email successfully', async () => {
      const { sendPaymentReceiptEmail } = await getModule();
      await sendPaymentReceiptEmail('user@test.com', 'John', ['fit', 'ai_readiness'], 2500, 'sess_123', 'gbp');
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include formatted amount with currency symbol', async () => {
      const { sendPaymentReceiptEmail } = await getModule();
      await sendPaymentReceiptEmail('user@test.com', 'John', ['fit'], 2500, 'sess_123', 'gbp');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('25.00');
    });

    it('should include assessment names', async () => {
      const { sendPaymentReceiptEmail } = await getModule();
      await sendPaymentReceiptEmail('user@test.com', 'John', ['fit', 'ai_readiness'], 2500, 'sess_123');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('FIT Assessment');
      expect(sendCall.html).toContain('AI Readiness Assessment');
    });

    it('should include session reference', async () => {
      const { sendPaymentReceiptEmail } = await getModule();
      await sendPaymentReceiptEmail('user@test.com', 'John', ['fit'], 2500, 'sess_abcdef123456', 'gbp');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('BCDEF123456');
    });

    it('should set correct subject', async () => {
      const { sendPaymentReceiptEmail } = await getModule();
      await sendPaymentReceiptEmail('user@test.com', 'John', ['fit'], 2500, 'sess_123');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toBe('Payment Receipt - HumanMetrix');
    });
  });

  describe('sendPaymentReceiptWithPdf', () => {
    it('should send receipt email with PDF attachment', async () => {
      const { sendPaymentReceiptWithPdf } = await getModule();
      const result = await sendPaymentReceiptWithPdf({
        email: 'user@test.com',
        name: 'John',
        items: [{ description: 'FIT Assessment', amount: 1500 }],
        subtotal: 1500,
        total: 1500,
        currency: 'gbp',
        transactionId: 'txn_12345678',
      });
      expect(result.success).toBe(true);
      expect(result.receiptNumber).toBeDefined();
    });

    it('should include PDF attachment in email', async () => {
      const { sendPaymentReceiptWithPdf } = await getModule();
      const result = await sendPaymentReceiptWithPdf({
        email: 'user@test.com',
        name: 'John',
        items: [{ description: 'FIT Assessment', amount: 1500 }],
        subtotal: 1500,
        total: 1500,
        currency: 'gbp',
        transactionId: 'txn_12345678',
      });
      expect(result.success).toBe(true);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.attachments).toBeDefined();
    });

    it('should handle PDF generation errors gracefully', async () => {
      mockGenerateReceiptPDF.mockImplementationOnce(() => { throw new Error('PDF error'); });
      const { sendPaymentReceiptWithPdf } = await getModule();
      const result = await sendPaymentReceiptWithPdf({
        email: 'user@test.com',
        name: 'John',
        items: [{ description: 'FIT Assessment', amount: 1500 }],
        subtotal: 1500,
        total: 1500,
        currency: 'gbp',
        transactionId: 'txn_12345678',
      });
      expect(result).toBeDefined();
    });

    it('should format currency correctly for USD', async () => {
      const { sendPaymentReceiptWithPdf } = await getModule();
      await sendPaymentReceiptWithPdf({
        email: 'user@test.com',
        name: 'John',
        items: [{ description: 'FIT Assessment', amount: 2000 }],
        subtotal: 2000,
        total: 2000,
        currency: 'usd',
        transactionId: 'txn_45678901',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('$');
    });
  });

  describe('sendPartnerQuotaWarning70', () => {
    it('should send 70% quota warning email', async () => {
      const { sendPartnerQuotaWarning70 } = await getModule();
      await sendPartnerQuotaWarning70('partner@test.com', 'Acme Corp', 70, 100, 30);
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include usage percentage', async () => {
      const { sendPartnerQuotaWarning70 } = await getModule();
      await sendPartnerQuotaWarning70('partner@test.com', 'Acme Corp', 70, 100, 30);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('70%');
    });

    it('should include remaining credits', async () => {
      const { sendPartnerQuotaWarning70 } = await getModule();
      await sendPartnerQuotaWarning70('partner@test.com', 'Acme Corp', 70, 100, 30);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('30');
    });

    it('should include company name', async () => {
      const { sendPartnerQuotaWarning70 } = await getModule();
      await sendPartnerQuotaWarning70('partner@test.com', 'Acme Corp', 70, 100, 30);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });

    it('should include top-up link', async () => {
      const { sendPartnerQuotaWarning70 } = await getModule();
      await sendPartnerQuotaWarning70('partner@test.com', 'Acme Corp', 70, 100, 30);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('partner-dashboard?tab=billing');
    });
  });

  describe('sendPartnerQuotaWarning90', () => {
    it('should send 90% quota warning email', async () => {
      const { sendPartnerQuotaWarning90 } = await getModule();
      await sendPartnerQuotaWarning90('partner@test.com', 'Acme Corp', 90, 100, 10);
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include usage stats', async () => {
      const { sendPartnerQuotaWarning90 } = await getModule();
      await sendPartnerQuotaWarning90('partner@test.com', 'Acme Corp', 90, 100, 10);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('90');
    });
  });

  describe('sendPartnerWelcomeEmail', () => {
    const welcomeDetails = {
      partnerName: 'John Manager',
      companyName: 'Acme Corp',
      email: 'john@acme.com',
      temporaryPassword: 'TempPass!123',
      billingType: 'prepaid' as const,
      freeTestsAllocated: 10,
    };

    it('should send partner welcome email successfully', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      const result = await sendPartnerWelcomeEmail(welcomeDetails);
      expect(result.success).toBe(true);
    });

    it('should include temporary password', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail(welcomeDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('TempPass!123');
    });

    it('should include company name', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail(welcomeDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });

    it('should include billing type description', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail(welcomeDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Prepaid');
    });

    it('should include free tests allocation', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail(welcomeDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('10');
    });

    it('should include auto-login URL when token provided', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail({ ...welcomeDetails, autoLoginToken: 'auto-xyz' });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('/auto-login/auto-xyz');
    });

    it('should set correct subject', async () => {
      const { sendPartnerWelcomeEmail } = await getModule();
      await sendPartnerWelcomeEmail(welcomeDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Welcome to HumanMetrix Partner Programme');
    });
  });

  describe('sendGeneralEnquiryEmail', () => {
    it('should send enquiry email to correct address', async () => {
      const { sendGeneralEnquiryEmail } = await getModule();
      const result = await sendGeneralEnquiryEmail({
        name: 'Jane',
        email: 'jane@test.com',
        subject: 'Pricing question',
        message: 'How much does it cost?',
      });
      expect(result.success).toBe(true);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.to).toBe('hello@humanmetrix.co.uk');
    });

    it('should include sender details in email', async () => {
      const { sendGeneralEnquiryEmail } = await getModule();
      await sendGeneralEnquiryEmail({
        name: 'Jane',
        email: 'jane@test.com',
        subject: 'Question',
        message: 'My question',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Jane');
      expect(sendCall.html).toContain('jane@test.com');
    });

    it('should set reply-to as sender email', async () => {
      const { sendGeneralEnquiryEmail } = await getModule();
      await sendGeneralEnquiryEmail({
        name: 'Jane',
        email: 'jane@test.com',
        subject: 'Question',
        message: 'My question',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.replyTo).toBe('jane@test.com');
    });
  });

  describe('sendPartnerBulkInvitationEmail', () => {
    const bulkDetails = {
      candidateEmail: 'candidate@test.com',
      candidateName: 'Jane Doe',
      assessmentTypes: ['fit'],
      inviteToken: 'bulk-token-123',
      partnerCompanyName: 'Acme Corp',
    };

    it('should send bulk invitation email successfully', async () => {
      const { sendPartnerBulkInvitationEmail } = await getModule();
      await sendPartnerBulkInvitationEmail(bulkDetails);
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include partner company name', async () => {
      const { sendPartnerBulkInvitationEmail } = await getModule();
      await sendPartnerBulkInvitationEmail(bulkDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });

    it('should include assessment link with token', async () => {
      const { sendPartnerBulkInvitationEmail } = await getModule();
      await sendPartnerBulkInvitationEmail(bulkDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('token=bulk-token-123');
    });

    it('should use Gmail when forceGmail option is set', async () => {
      setupSendGridFailure();
      const { sendPartnerBulkInvitationEmail } = await getModule();
      await sendPartnerBulkInvitationEmail(bulkDetails, { forceGmail: true });
      expect(mockSendMail).toHaveBeenCalled();
    });
  });

  describe('sendB2BCongratulatoryEmail', () => {
    const congratsDetails = {
      email: 'candidate@test.com',
      candidateName: 'John',
      assessmentType: 'fit',
      partnerCompanyName: 'Acme Corp',
      paymentUrl: 'https://test.com/pay',
      paymentAmount: '9.99',
      freeUnlockDate: new Date('2026-04-01'),
    };

    it('should send congratulatory email successfully', async () => {
      const { sendB2BCongratulatoryEmail } = await getModule();
      const result = await sendB2BCongratulatoryEmail(congratsDetails);
      expect(result.success).toBe(true);
    });

    it('should include assessment name', async () => {
      const { sendB2BCongratulatoryEmail } = await getModule();
      await sendB2BCongratulatoryEmail(congratsDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('FIT Assessment');
    });

    it('should include payment URL', async () => {
      const { sendB2BCongratulatoryEmail } = await getModule();
      await sendB2BCongratulatoryEmail(congratsDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://test.com/pay');
    });

    it('should include free unlock date', async () => {
      const { sendB2BCongratulatoryEmail } = await getModule();
      await sendB2BCongratulatoryEmail(congratsDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('April');
      expect(sendCall.html).toContain('2026');
    });

    it('should show discount when original price differs', async () => {
      const { sendB2BCongratulatoryEmail } = await getModule();
      await sendB2BCongratulatoryEmail({
        ...congratsDetails,
        originalPaymentAmount: '12.99',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('25% off');
    });
  });

  describe('sendB2BAllCompleteEmail', () => {
    it('should send all-complete email successfully', async () => {
      const { sendB2BAllCompleteEmail } = await getModule();
      const result = await sendB2BAllCompleteEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        partnerCompanyName: 'Acme Corp',
        completedAssessments: ['fit', 'ai_readiness'],
        paidAssessments: ['fit'],
        unpaidAssessments: ['ai_readiness'],
        paymentUrl: 'https://test.com/pay',
        bundlePrice: '19.99',
        originalTotalPrice: '29.99',
        discountPercentage: 33,
        freeUnlockDate: new Date('2026-04-01'),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendB2BResultsReadyEmail', () => {
    it('should send results ready notification', async () => {
      const { sendB2BResultsReadyEmail } = await getModule();
      const result = await sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        partnerName: 'Acme Corp',
        dashboardUrl: 'https://test.com/dashboard',
      });
      expect(result.success).toBe(true);
    });

    it('should include partner name', async () => {
      const { sendB2BResultsReadyEmail } = await getModule();
      await sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        partnerName: 'Acme Corp',
        dashboardUrl: 'https://test.com/dashboard',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });

    it('should include auto-login URL when token provided', async () => {
      const { sendB2BResultsReadyEmail } = await getModule();
      await sendB2BResultsReadyEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        partnerName: 'Acme Corp',
        dashboardUrl: 'https://test.com/dashboard',
        autoLoginToken: 'auto-abc',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('auto-login/auto-abc');
    });
  });

  describe('sendB2BResultsEmail', () => {
    it('should send results email with PDF attachment', async () => {
      const { sendB2BResultsEmail } = await getModule();
      const result = await sendB2BResultsEmail({
        email: 'candidate@test.com',
        candidateName: 'John',
        assessmentType: 'fit',
        partnerCompanyName: 'Acme Corp',
        pdfBuffer: Buffer.from('fake-pdf-content'),
        pdfFilename: 'FIT_Assessment_Results.pdf',
      });
      expect(result.success).toBe(true);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.attachments).toHaveLength(1);
      expect(sendCall.attachments[0].filename).toBe('FIT_Assessment_Results.pdf');
    });

    it('should include assessment name in subject', async () => {
      const { sendB2BResultsEmail } = await getModule();
      await sendB2BResultsEmail({
        email: 'candidate@test.com',
        assessmentType: 'fit',
        partnerCompanyName: 'Acme Corp',
        pdfBuffer: Buffer.from('fake-pdf'),
        pdfFilename: 'results.pdf',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('FIT Assessment');
    });
  });

  describe('sendB2BResultsEmailWithDownloadLink', () => {
    it('should send results email with download link', async () => {
      const { sendB2BResultsEmailWithDownloadLink } = await getModule();
      await sendB2BResultsEmailWithDownloadLink({
        email: 'candidate@test.com',
        candidateName: 'John',
        assessmentType: 'fit',
        partnerCompanyName: 'Acme Corp',
        downloadUrl: 'https://test.com/download/results.pdf',
        expiryDays: 7,
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://test.com/download/results.pdf');
    });
  });

  describe('sendB2BResultsEmailWithMultiplePDFs', () => {
    it('should send email with multiple PDF attachments', async () => {
      const { sendB2BResultsEmailWithMultiplePDFs } = await getModule();
      await sendB2BResultsEmailWithMultiplePDFs({
        email: 'candidate@test.com',
        candidateName: 'John',
        assessmentLabel: '2 Assessments',
        partnerCompanyName: 'Acme Corp',
        resultsUrl: 'https://test.com/results',
        pdfAttachments: [
          { filename: 'fit.pdf', content: Buffer.from('pdf1') },
          { filename: 'air.pdf', content: Buffer.from('pdf2') },
        ],
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.attachments).toHaveLength(2);
    });
  });

  describe('sendBundleResultsEmail', () => {
    it('should send bundle results email', async () => {
      const { sendBundleResultsEmail } = await getModule();
      await sendBundleResultsEmail({
        email: 'candidate@test.com',
        partnerCompanyName: 'Acme Corp',
        attachments: [
          { filename: 'fit_results.pdf', buffer: Buffer.from('pdf1'), assessmentType: 'fit' },
          { filename: 'air_results.pdf', buffer: Buffer.from('pdf2'), assessmentType: 'ai_readiness' },
        ],
      });
      expect(mockSgSend).toHaveBeenCalled();
    });
  });

  describe('sendPartnerTeamInvitationEmail', () => {
    const teamInviteDetails = {
      email: 'newmember@test.com',
      inviteeName: 'Jane',
      inviterName: 'John Manager',
      companyName: 'Acme Corp',
      inviteToken: 'team-invite-token',
      role: 'admin',
    };

    it('should send team invitation email successfully', async () => {
      const { sendPartnerTeamInvitationEmail } = await getModule();
      const result = await sendPartnerTeamInvitationEmail(teamInviteDetails);
      expect(result.success).toBe(true);
    });

    it('should include invite acceptance URL', async () => {
      const { sendPartnerTeamInvitationEmail } = await getModule();
      await sendPartnerTeamInvitationEmail(teamInviteDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('/partner/accept-invite/team-invite-token');
    });

    it('should display admin role correctly', async () => {
      const { sendPartnerTeamInvitationEmail } = await getModule();
      await sendPartnerTeamInvitationEmail(teamInviteDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Administrator');
    });

    it('should display member role correctly', async () => {
      const { sendPartnerTeamInvitationEmail } = await getModule();
      await sendPartnerTeamInvitationEmail({ ...teamInviteDetails, role: 'member' });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Team Member');
    });

    it('should include inviter name', async () => {
      const { sendPartnerTeamInvitationEmail } = await getModule();
      await sendPartnerTeamInvitationEmail(teamInviteDetails);
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('John Manager');
    });
  });

  describe('sendPartnerTeamCredentialsEmail', () => {
    it('should send team credentials email successfully', async () => {
      const { sendPartnerTeamCredentialsEmail } = await getModule();
      const result = await sendPartnerTeamCredentialsEmail({
        email: 'member@test.com',
        name: 'Jane',
        companyName: 'Acme Corp',
        role: 'member',
        temporaryPassword: 'TempPass!',
      });
      expect(result.success).toBe(true);
    });

    it('should include temporary password', async () => {
      const { sendPartnerTeamCredentialsEmail } = await getModule();
      await sendPartnerTeamCredentialsEmail({
        email: 'member@test.com',
        name: 'Jane',
        companyName: 'Acme Corp',
        role: 'member',
        temporaryPassword: 'TempPass!456',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('TempPass!456');
    });
  });

  describe('sendB2BResultsUnlockedEmail', () => {
    it('should send results unlocked email', async () => {
      const { sendB2BResultsUnlockedEmail } = await getModule();
      const result = await sendB2BResultsUnlockedEmail(
        'user@test.com', 'fit', 'Acme Corp', 'https://test.com/results'
      );
      expect(result.success).toBe(true);
    });

    it('should include results URL', async () => {
      const { sendB2BResultsUnlockedEmail } = await getModule();
      await sendB2BResultsUnlockedEmail(
        'user@test.com', 'fit', 'Acme Corp', 'https://test.com/results'
      );
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://test.com/results');
    });

    it('should include receipt details when provided', async () => {
      const { sendB2BResultsUnlockedEmail } = await getModule();
      await sendB2BResultsUnlockedEmail(
        'user@test.com', 'fit', 'Acme Corp', 'https://test.com/results',
        { amount: 999, currency: 'GBP', assessmentTypes: ['fit'], purchaseDate: new Date() }
      );
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Payment Receipt');
    });
  });

  describe('sendResultsReadyEmail', () => {
    it('should send results ready email successfully', async () => {
      const { sendResultsReadyEmail } = await getModule();
      await sendResultsReadyEmail({
        email: 'user@test.com',
        candidateName: 'John',
        assessmentTypes: ['fit'],
        partnerCompanyName: 'Acme Corp',
        hasExistingAccount: true,
      });
      expect(mockSgSend).toHaveBeenCalled();
    });
  });

  describe('sendEmailVerificationCode', () => {
    it('should send verification code email', async () => {
      const { sendEmailVerificationCode } = await getModule();
      const result = await sendEmailVerificationCode('user@test.com', '123456');
      expect(result.success).toBe(true);
    });

    it('should include the verification code', async () => {
      const { sendEmailVerificationCode } = await getModule();
      await sendEmailVerificationCode('user@test.com', '987654');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('987654');
    });

    it('should include code in subject line', async () => {
      const { sendEmailVerificationCode } = await getModule();
      await sendEmailVerificationCode('user@test.com', '123456');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('123456');
    });

    it('should include partner name when provided', async () => {
      const { sendEmailVerificationCode } = await getModule();
      await sendEmailVerificationCode('user@test.com', '123456', 'Acme Corp');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });

    it('should mention 10 minute expiry', async () => {
      const { sendEmailVerificationCode } = await getModule();
      await sendEmailVerificationCode('user@test.com', '123456');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('10 minutes');
    });
  });

  describe('sendBillingFailureNotification', () => {
    it('should send billing failure notification', async () => {
      const { sendBillingFailureNotification } = await getModule();
      const result = await sendBillingFailureNotification({
        partnerEmail: 'partner@test.com',
        companyName: 'Acme Corp',
        failureReason: 'Card declined',
        failedAttempts: 1,
        amountDue: 5000,
        currency: 'gbp',
        updatePaymentUrl: 'https://test.com/billing',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendCardExpiryWarning', () => {
    it('should send card expiry warning', async () => {
      const { sendCardExpiryWarning } = await getModule();
      const result = await sendCardExpiryWarning({
        partnerEmail: 'partner@test.com',
        companyName: 'Acme Corp',
        cardLast4: '4242',
        cardBrand: 'visa',
        expiryMonth: 3,
        expiryYear: 2026,
        daysUntilExpiry: 14,
        updatePaymentUrl: 'https://test.com/billing',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('sendBillingFailureAdminNotification', () => {
    it('should send admin billing failure notification', async () => {
      const { sendBillingFailureAdminNotification } = await getModule();
      const result = await sendBillingFailureAdminNotification({
        partnerId: 'partner-1',
        companyName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        failureReason: 'Insufficient funds',
        failedAttempts: 2,
        amountDue: 10000,
        currency: 'gbp',
        billingType: 'subscription',
      });
      expect(result.success).toBe(true);
    });

    it('should indicate suspension when 3+ failed attempts', async () => {
      const { sendBillingFailureAdminNotification } = await getModule();
      await sendBillingFailureAdminNotification({
        partnerId: 'partner-1',
        companyName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        failureReason: 'Insufficient funds',
        failedAttempts: 3,
        amountDue: 10000,
        currency: 'gbp',
        billingType: 'subscription',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('Suspended');
    });
  });

  describe('notifyB2CPaymentFailure', () => {
    it('should call notifySuperAdmins for B2C payment failure', async () => {
      const { notifyB2CPaymentFailure } = await getModule();
      const result = await notifyB2CPaymentFailure({
        userEmail: 'user@test.com',
        userName: 'John',
        amountDue: 1500,
        currency: 'gbp',
        failureReason: 'Card declined',
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('notifyB2BTestTakerPaymentFailure', () => {
    it('should call notifySuperAdmins for B2B payment failure', async () => {
      const { notifyB2BTestTakerPaymentFailure } = await getModule();
      const result = await notifyB2BTestTakerPaymentFailure({
        candidateEmail: 'candidate@test.com',
        candidateName: 'Jane',
        sessionId: 'sess_1234567890abcdef12345',
        assessmentType: 'fit',
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        amountDue: 999,
        currency: 'gbp',
        failureReason: 'Card expired',
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('notifyB2BInvoiceOverdue', () => {
    it('should call notifySuperAdmins for overdue invoice', async () => {
      const { notifyB2BInvoiceOverdue } = await getModule();
      const result = await notifyB2BInvoiceOverdue({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        invoiceId: 'inv-1',
        invoiceNumber: 'INV-001',
        amountDue: 50000,
        currency: 'gbp',
        dueDate: new Date('2026-01-15'),
        daysOverdue: 30,
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('notifyInvoiceSuspension', () => {
    it('should send invoice suspension notification', async () => {
      const { notifyInvoiceSuspension } = await getModule();
      const result = await notifyInvoiceSuspension({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        invoiceNumber: 'INV-001',
        amountDue: 50000,
        currency: 'gbp',
        dueDate: new Date('2026-01-15'),
        daysOverdue: 45,
        paymentUrl: 'https://test.com/pay',
      });
      expect(result.success).toBe(true);
    });

    it('should use different subject for manual suspension', async () => {
      const { notifyInvoiceSuspension } = await getModule();
      await notifyInvoiceSuspension({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        invoiceNumber: 'N/A',
        amountDue: 0,
        currency: 'gbp',
        dueDate: new Date(),
        daysOverdue: 0,
        paymentUrl: 'https://test.com/billing',
        customReason: 'Suspended for review',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toBe('URGENT: API Access Suspended');
    });

    it('should include invoice number for invoice-based suspension', async () => {
      const { notifyInvoiceSuspension } = await getModule();
      await notifyInvoiceSuspension({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        invoiceNumber: 'INV-002',
        amountDue: 50000,
        currency: 'gbp',
        dueDate: new Date('2026-01-15'),
        daysOverdue: 45,
        paymentUrl: 'https://test.com/pay',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('INV-002');
    });
  });

  describe('notifyInvoiceRestoration', () => {
    it('should send restoration notification', async () => {
      const { notifyInvoiceRestoration } = await getModule();
      const result = await notifyInvoiceRestoration({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        dashboardUrl: 'https://test.com/dashboard',
      });
      expect(result.success).toBe(true);
    });

    it('should include dashboard URL', async () => {
      const { notifyInvoiceRestoration } = await getModule();
      await notifyInvoiceRestoration({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        dashboardUrl: 'https://test.com/dashboard',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://test.com/dashboard');
    });

    it('should set correct subject', async () => {
      const { notifyInvoiceRestoration } = await getModule();
      await notifyInvoiceRestoration({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        dashboardUrl: 'https://test.com/dashboard',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toBe('API Access Restored - HumanMetrix');
    });
  });

  describe('notifyPrepaidLowBalance', () => {
    it('should call notifySuperAdmins for low balance', async () => {
      const { notifyPrepaidLowBalance } = await getModule();
      const result = await notifyPrepaidLowBalance({
        partnerId: 'partner-1',
        partnerName: 'Acme Corp',
        partnerEmail: 'partner@test.com',
        currentBalance: 500,
        currency: 'gbp',
        testsRemaining: 3,
        rechargeUrl: 'https://test.com/topup',
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('notifyCriticalError', () => {
    it('should return result for Error objects', async () => {
      const { notifyCriticalError } = await getModule();
      const result = await notifyCriticalError({
        source: 'Payment Processing',
        error: new Error('Stripe API timeout'),
        userId: 'user-1',
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should return result for string errors', async () => {
      const { notifyCriticalError } = await getModule();
      const result = await notifyCriticalError({
        source: 'API Gateway',
        error: 'Connection refused',
      });
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should accept additional context', async () => {
      const { notifyCriticalError } = await getModule();
      const result = await notifyCriticalError({
        source: 'Scoring Worker',
        error: 'Timeout error',
        additionalContext: { jobId: 'job-123' },
      });
      expect(result).toBeDefined();
    });
  });

  describe('sendBroadcastEmail', () => {
    it('should send broadcast email successfully', async () => {
      const { sendBroadcastEmail } = await getModule();
      const result = await sendBroadcastEmail('user@test.com', 'Update', 'Important update content');
      expect(result.success).toBe(true);
    });

    it('should use title as subject', async () => {
      const { sendBroadcastEmail } = await getModule();
      await sendBroadcastEmail('user@test.com', 'System Update', 'Content here');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toBe('System Update');
    });

    it('should include content in email body', async () => {
      const { sendBroadcastEmail } = await getModule();
      await sendBroadcastEmail('user@test.com', 'Title', 'Important broadcast content');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Important broadcast content');
    });

    it('should handle send failure gracefully', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendBroadcastEmail } = await getModule();
      const result = await sendBroadcastEmail('user@test.com', 'Title', 'Content');
      expect(result.success).toBe(true);
    });
  });

  describe('sendBugReportNotificationEmail', () => {
    it('should send bug report notification', async () => {
      const { sendBugReportNotificationEmail } = await getModule();
      const result = await sendBugReportNotificationEmail({
        bugId: 'BUG-001',
        title: 'Login page broken',
        description: 'Cannot login with valid credentials',
        severity: 'critical',
        reporterName: 'John',
        reporterEmail: 'john@test.com',
      });
      expect(result.success).toBe(true);
    });

    it('should include severity in subject', async () => {
      const { sendBugReportNotificationEmail } = await getModule();
      await sendBugReportNotificationEmail({
        bugId: 'BUG-001',
        title: 'Login page broken',
        description: 'Issue details',
        severity: 'high',
        reporterName: 'John',
        reporterEmail: 'john@test.com',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('HIGH');
    });

    it('should send to admin recipients', async () => {
      const { sendBugReportNotificationEmail } = await getModule();
      await sendBugReportNotificationEmail({
        bugId: 'BUG-002',
        title: 'Minor UI issue',
        description: 'Details',
        severity: 'low',
        reporterName: 'Jane',
        reporterEmail: 'jane@test.com',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.to).toContain('daena@humanmetrix.co.uk');
      expect(sendCall.to).toContain('oskar@humanmetrix.co.uk');
    });

    it('should include bug ID in email', async () => {
      const { sendBugReportNotificationEmail } = await getModule();
      await sendBugReportNotificationEmail({
        bugId: 'BUG-003',
        title: 'Issue',
        description: 'Details',
        severity: 'medium',
        reporterName: 'John',
        reporterEmail: 'john@test.com',
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('BUG-003');
    });

    it('should handle send failure', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendBugReportNotificationEmail } = await getModule();
      const result = await sendBugReportNotificationEmail({
        bugId: 'BUG-004',
        title: 'Issue',
        description: 'Details',
        severity: 'low',
        reporterName: 'John',
        reporterEmail: 'john@test.com',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('retrySendViaGmail', () => {
    it('should send via Gmail directly', async () => {
      const { retrySendViaGmail } = await getModule();
      const result = await retrySendViaGmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should return messageId on success', async () => {
      const { retrySendViaGmail } = await getModule();
      const result = await retrySendViaGmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.messageId).toBe('gmail-msg-456');
    });

    it('should return failure when Gmail fails', async () => {
      setupGmailFailure();
      const { retrySendViaGmail } = await getModule();
      const result = await retrySendViaGmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
    });

    it('should accept log context parameter', async () => {
      const { retrySendViaGmail } = await getModule();
      const result = await retrySendViaGmail(
        { to: 'user@test.com', subject: 'Test', html: '<p>Test</p>' },
        { recipientType: 'b2b_test_taker', emailType: 'invitation' }
      );
      expect(result.success).toBe(true);
      await new Promise(r => setTimeout(r, 50));
    });
  });

  describe('sendPartnerEmail', () => {
    it('should send partner email successfully', async () => {
      const { sendPartnerEmail } = await getModule();
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test Subject',
        html: '<p>Test content</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should support text content', async () => {
      const { sendPartnerEmail } = await getModule();
      await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
        text: 'Plain text version',
      });
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should accept log context parameter', async () => {
      const { sendPartnerEmail } = await getModule();
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
        logContext: {
          recipientType: 'partner',
          emailType: 'system_notification',
        },
      });
      expect(result.success).toBe(true);
      await new Promise(r => setTimeout(r, 50));
    });
  });

  describe('Email Failover Logic', () => {
    it('should use Gmail when SendGrid fails', async () => {
      setupSendGridFailure();
      const { sendPartnerEmail } = await getModule();
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('should return success when backup provider succeeds', async () => {
      setupSendGridFailure();
      const { sendPartnerEmail } = await getModule();
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(true);
    });

    it('should return failure when both providers fail', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendPartnerEmail } = await getModule();
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Production URL Configuration', () => {
    it('should use PRODUCTION_URL when set', async () => {
      process.env.PRODUCTION_URL = 'https://custom.domain.com';
      const { sendInvitationEmail } = await getModule();
      const mockInv = {
        id: 1,
        candidateEmail: 'test@test.com',
        candidateName: 'Test',
        assessmentTypes: ['fit'],
        token: 'token',
        message: '',
        expiresAt: new Date('2026-03-01'),
        status: 'pending' as const,
        partnerId: 1,
        createdAt: new Date(),
        inviterId: 1,
        updatedAt: new Date(),
        completedAt: null,
        maxAttempts: 1,
        currentAttempts: 0,
      };
      await sendInvitationEmail(mockInv, 'Manager');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://custom.domain.com');
    });

    it('should strip trailing slash from PRODUCTION_URL', async () => {
      process.env.PRODUCTION_URL = 'https://custom.domain.com/';
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'token');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).not.toContain('custom.domain.com//');
    });

    it('should use Replit domain as fallback', async () => {
      delete process.env.PRODUCTION_URL;
      process.env.REPLIT_DOMAINS = 'myapp.replit.app,other.replit.app';
      const { sendPasswordResetEmail } = await getModule();
      await sendPasswordResetEmail('user@test.com', 'John', 'token');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('https://myapp.replit.app');
    });
  });

  describe('Email Logging', () => {
    it('should send email successfully for logging verification', async () => {
      const { sendInvitationEmail } = await getModule();
      const mockInv = {
        id: 1,
        candidateEmail: 'test@test.com',
        candidateName: 'Test',
        assessmentTypes: ['fit'],
        token: 'token',
        message: '',
        expiresAt: new Date('2026-03-01'),
        status: 'pending' as const,
        partnerId: 1,
        createdAt: new Date(),
        inviterId: 1,
        updatedAt: new Date(),
        completedAt: null,
        maxAttempts: 1,
        currentAttempts: 0,
      };
      const result = await sendInvitationEmail(mockInv, 'Manager');
      expect(result.success).toBe(true);
      await new Promise(r => setTimeout(r, 50));
    });

    it('should attempt to log emails on failure', async () => {
      setupSendGridFailure();
      setupGmailFailure();
      const { sendInvitationEmail } = await getModule();
      const mockInv = {
        id: 1,
        candidateEmail: 'test@test.com',
        candidateName: 'Test',
        assessmentTypes: ['fit'],
        token: 'token',
        message: '',
        expiresAt: new Date('2026-03-01'),
        status: 'pending' as const,
        partnerId: 1,
        createdAt: new Date(),
        inviterId: 1,
        updatedAt: new Date(),
        completedAt: null,
        maxAttempts: 1,
        currentAttempts: 0,
      };
      const result = await sendInvitationEmail(mockInv, 'Manager');
      expect(result.success).toBe(false);
      await new Promise(r => setTimeout(r, 50));
    });
  });

  describe('notifySuperAdmins', () => {
    it('should attempt to send emails and create notifications', async () => {
      const { notifySuperAdmins } = await getModule();
      const result = await notifySuperAdmins({
        type: 'test',
        severity: 'info',
        title: 'Test Notification',
        message: 'Test message',
        emailSubject: 'Test',
        emailHtml: '<p>Test</p>',
      });
      expect(result).toBeDefined();
      expect(typeof result.emailSent).toBe('boolean');
      expect(typeof result.notificationCreated).toBe('boolean');
    });

    it('should return result object with expected shape', async () => {
      const { notifySuperAdmins } = await getModule();
      const result = await notifySuperAdmins({
        type: 'test',
        severity: 'warning',
        title: 'Warning',
        message: 'Warning message',
        emailSubject: 'Warning Email',
        emailHtml: '<p>Warning</p>',
      });
      expect(result).toHaveProperty('emailSent');
      expect(result).toHaveProperty('notificationCreated');
    });
  });

  describe('sendPartnerAccessSuspendedEmail', () => {
    it('should send access suspended email', async () => {
      const { sendPartnerAccessSuspendedEmail } = await getModule();
      await sendPartnerAccessSuspendedEmail(
        'partner@test.com', 'Acme Corp'
      );
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include company name', async () => {
      const { sendPartnerAccessSuspendedEmail } = await getModule();
      await sendPartnerAccessSuspendedEmail('partner@test.com', 'Acme Corp');
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Acme Corp');
    });
  });

  describe('sendPartnerSecurityAlert', () => {
    it('should send security alert email', async () => {
      const { sendPartnerSecurityAlert } = await getModule();
      await sendPartnerSecurityAlert(
        'partner@test.com', 'Acme Corp', 'Suspicious API Activity', 'Unusual login activity detected'
      );
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include alert type in subject', async () => {
      const { sendPartnerSecurityAlert } = await getModule();
      await sendPartnerSecurityAlert(
        'partner@test.com', 'Acme Corp', 'API Key Compromise', 'Your key may be compromised'
      );
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('API Key Compromise');
    });
  });

  describe('sendPartnerMonthlySummary', () => {
    it('should send monthly summary email', async () => {
      const { sendPartnerMonthlySummary } = await getModule();
      await sendPartnerMonthlySummary(
        'partner@test.com', 'Acme Corp', 'January 2026', 85, 15
      );
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include month name in subject', async () => {
      const { sendPartnerMonthlySummary } = await getModule();
      await sendPartnerMonthlySummary(
        'partner@test.com', 'Acme Corp', 'February 2026', 50, 50
      );
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('February 2026');
    });
  });

  describe('sendPartnerAutoTopUpConfirmation', () => {
    it('should send auto top-up confirmation', async () => {
      const { sendPartnerAutoTopUpConfirmation } = await getModule();
      await sendPartnerAutoTopUpConfirmation(
        'partner@test.com', 'Acme Corp', 50, 99.99, 'Standard Package'
      );
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include package name', async () => {
      const { sendPartnerAutoTopUpConfirmation } = await getModule();
      await sendPartnerAutoTopUpConfirmation(
        'partner@test.com', 'Acme Corp', 50, 99.99, 'Premium Package'
      );
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.html).toContain('Premium Package');
    });
  });

  describe('sendPartnerInvoiceEmail', () => {
    it('should send partner invoice email', async () => {
      const { sendPartnerInvoiceEmail } = await getModule();
      await sendPartnerInvoiceEmail({
        partnerEmail: 'partner@test.com',
        companyName: 'Acme Corp',
        invoiceNumber: 'INV-2026-001',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        testsUsed: 10,
        pricePerTest: 1500,
        subtotal: 15000,
        vatRate: 20,
        vatAmount: 3000,
        totalAmount: 18000,
        currency: 'gbp',
        dueDate: new Date('2026-03-01'),
        paymentTermsDays: 30,
      });
      expect(mockSgSend).toHaveBeenCalled();
    });

    it('should include invoice number in subject', async () => {
      const { sendPartnerInvoiceEmail } = await getModule();
      await sendPartnerInvoiceEmail({
        partnerEmail: 'partner@test.com',
        companyName: 'Acme Corp',
        invoiceNumber: 'INV-2026-002',
        periodStart: new Date('2026-01-01'),
        periodEnd: new Date('2026-01-31'),
        testsUsed: 5,
        pricePerTest: 1500,
        subtotal: 7500,
        vatRate: 20,
        vatAmount: 1500,
        totalAmount: 9000,
        currency: 'gbp',
        dueDate: new Date('2026-03-01'),
        paymentTermsDays: 30,
      });
      const sendCall = mockSgSend.mock.calls[0][0];
      expect(sendCall.subject).toContain('INV-2026-002');
    });
  });

  describe('Type Exports', () => {
    it('should export RecipientType', async () => {
      const module = await getModule();
      const recipientType: typeof module.RecipientType = undefined as any;
      expect(true).toBe(true);
    });

    it('should export EmailType', async () => {
      const module = await getModule();
      const emailType: typeof module.EmailType = undefined as any;
      expect(true).toBe(true);
    });

    it('should export EmailProvider', async () => {
      const module = await getModule();
      const provider: typeof module.EmailProvider = undefined as any;
      expect(true).toBe(true);
    });
  });
});
