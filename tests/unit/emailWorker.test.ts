import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();
const mockSetApiKey = vi.fn();
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: mockSetApiKey,
    send: mockSend,
  },
}));

const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport,
  },
}));

const mockEnqueue = vi.fn().mockResolvedValue('job_123');
vi.mock('../../server/queues/jobQueue', () => ({
  emailQueue: {
    enqueue: mockEnqueue,
    registerHandler: vi.fn(),
  },
}));

describe('emailWorker', () => {
  let mod: any;
  const originalEnv = { ...process.env };

  const mockInvitation = {
    id: 'inv-1',
    token: 'tok123',
    candidateEmail: 'candidate@test.com',
    candidateName: 'Jane Doe',
    assessmentTypes: ['fit', 'aiq'],
    message: 'Good luck!',
    sentBy: 'user-1',
    organizationId: 'org-1',
    status: 'sent',
    expiresAt: new Date('2026-12-31'),
    sentAt: new Date(),
    completedAt: null,
    emailBounced: false,
    bounceReason: null,
    bouncedAt: null,
  };

  const mockInvitationNoMessage = { ...mockInvitation, message: null };

  function setupFetchMock(response?: any) {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(response ?? {
        items: [{
          settings: {
            api_key: 'sg-key-123',
            from_email: 'noreply@humanmetrix.co.uk',
          },
        }],
      }),
    });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.REPLIT_CONNECTORS_HOSTNAME = 'connectors.example.com';
    process.env.REPL_IDENTITY = 'test-identity';
    process.env.GMAIL_USER = 'test@gmail.com';
    process.env.GMAIL_APP_PASSWORD = 'app-pass';

    setupFetchMock();

    mockSend.mockResolvedValue([{ headers: { 'x-message-id': 'sg-msg-id' } }]);
    mockSendMail.mockResolvedValue({ messageId: 'gmail-msg-id' });
    mockCreateTransport.mockReturnValue({ sendMail: mockSendMail });

    mod = await import('../../server/queues/emailWorker');
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('handleEmailJob - SendGrid path', () => {
    it('sends invitation email via SendGrid', async () => {
      const result = await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitation, inviterName: 'John Smith' },
      });
      expect(mockSetApiKey).toHaveBeenCalledWith('sg-key-123');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('candidate@test.com');
      expect(msg.subject).toContain('John Smith');
      expect(result).toEqual({ messageId: 'sg-msg-id' });
    });

    it('sends invitation without message via SendGrid (no message block in HTML)', async () => {
      await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitationNoMessage, inviterName: 'John Smith' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('border-left:4px solid #667eea');
      expect(msg.text).not.toContain('Message:');
      expect(msg.to).toBe('candidate@test.com');
    });

    it('sends invitation with message via SendGrid (message block in HTML)', async () => {
      await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitation, inviterName: 'John Smith' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('border-left:4px solid #667eea');
      expect(msg.html).toContain('Good luck!');
      expect(msg.text).toContain('Good luck!');
    });

    it('sends password_reset email via SendGrid', async () => {
      const result = await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'user@test.com', name: 'Bob', resetToken: 'rst-tok' },
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('user@test.com');
      expect(msg.subject).toContain('Reset Your Password');
      expect(msg.html).toContain('rst-tok');
      expect(result).toEqual({ messageId: 'sg-msg-id' });
    });

    it('sends welcome email via SendGrid (invitation context, no note, no autoLoginToken)', async () => {
      const result = await mod.handleEmailJob({
        type: 'welcome',
        payload: { email: 'new@test.com', name: 'Alice', temporaryPassword: 'tmp123' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('new@test.com');
      expect(msg.subject).toBe('Your Assessment Invitation - HumanMetrix');
      expect(msg.html).toContain('tmp123');
      expect(msg.html).toContain('/login');
      expect(msg.html).not.toContain('auto-login');
      expect(result).toEqual({ messageId: 'sg-msg-id' });
    });

    it('sends welcome email via SendGrid (post_payment context, with note, with autoLoginToken)', async () => {
      await mod.handleEmailJob({
        type: 'welcome',
        payload: {
          email: 'new@test.com',
          name: 'Alice',
          temporaryPassword: 'tmp123',
          note: 'Please complete by Friday',
          context: 'post_payment',
          autoLoginToken: 'auto-tok-999',
        },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toBe('Your Account Credentials - HumanMetrix');
      expect(msg.html).toContain('auto-login/auto-tok-999');
      expect(msg.html).toContain('Please complete by Friday');
    });

    it('sends receipt email via SendGrid', async () => {
      const result = await mod.handleEmailJob({
        type: 'receipt',
        payload: {
          email: 'buyer@test.com',
          name: 'Charlie',
          assessments: ['fit', 'ai_readiness'],
          totalAmount: 5000,
          sessionId: 'sess_abc123456789',
          currency: 'usd',
        },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('buyer@test.com');
      expect(msg.subject).toBe('Payment Receipt - HumanMetrix');
      expect(msg.html).toContain('$50.00');
      expect(result).toEqual({ messageId: 'sg-msg-id' });
    });

    it('sends receipt email with default gbp currency via SendGrid', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: {
          email: 'buyer@test.com',
          name: 'Charlie',
          assessments: ['fit'],
          totalAmount: 2500,
          sessionId: 'sess_xyz123456789',
        },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('£25.00');
    });

    it('sends contact email via SendGrid (demo intent)', async () => {
      const result = await mod.handleEmailJob({
        type: 'contact',
        payload: {
          name: 'Prospect',
          email: 'prospect@corp.com',
          company: 'BigCorp',
          message: 'I want a demo',
          intent: 'demo',
        },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('hello@humanmetrix.co.uk');
      expect(msg.replyTo).toBe('prospect@corp.com');
      expect(msg.subject).toContain('Demo Request');
      expect(result).toEqual({ messageId: 'sg-msg-id' });
    });

    it('sends contact email via SendGrid (sales intent)', async () => {
      await mod.handleEmailJob({
        type: 'contact',
        payload: {
          name: 'Buyer',
          email: 'buyer@corp.com',
          company: 'SmallCo',
          message: 'Need pricing',
          intent: 'sales',
        },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('Sales Inquiry');
    });

    it('falls back to Gmail then throws on unknown email type', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await expect(
        mod.handleEmailJob({ type: 'unknown' as any, payload: {} })
      ).rejects.toThrow();
    });
  });

  describe('handleEmailJob - SendGrid failure falls back to Gmail', () => {
    beforeEach(() => {
      mockSend.mockRejectedValue(new Error('SendGrid API error'));
    });

    it('falls back to Gmail for invitation email', async () => {
      const result = await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitation, inviterName: 'John Smith' },
      });
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('candidate@test.com');
      expect(mailOpts.subject).toContain('John Smith');
      expect(result).toEqual({ messageId: 'gmail-msg-id' });
    });

    it('falls back to Gmail for password_reset', async () => {
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'user@test.com', name: 'Bob', resetToken: 'rst-tok' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('user@test.com');
      expect(mailOpts.subject).toContain('Reset Your Password');
    });

    it('falls back to Gmail for welcome (invitation context)', async () => {
      await mod.handleEmailJob({
        type: 'welcome',
        payload: { email: 'new@test.com', name: 'Alice', temporaryPassword: 'tmp123' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('new@test.com');
      expect(mailOpts.subject).toBe('Your Assessment Invitation - HumanMetrix');
    });

    it('falls back to Gmail for welcome (post_payment context, with autoLoginToken, with note)', async () => {
      await mod.handleEmailJob({
        type: 'welcome',
        payload: {
          email: 'new@test.com',
          name: 'Alice',
          temporaryPassword: 'tmp123',
          note: 'A note',
          context: 'post_payment',
          autoLoginToken: 'auto-tok',
        },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.subject).toBe('Your Account Credentials - HumanMetrix');
      expect(mailOpts.html).toContain('auto-login/auto-tok');
      expect(mailOpts.html).toContain('A note');
    });

    it('falls back to Gmail for receipt', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: {
          email: 'buyer@test.com',
          name: 'Charlie',
          assessments: ['aiq'],
          totalAmount: 3000,
          sessionId: 'sess_abc123456789',
          currency: 'eur',
        },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('buyer@test.com');
      expect(mailOpts.html).toContain('€30.00');
    });

    it('falls back to Gmail for receipt with default currency', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: {
          email: 'buyer@test.com',
          name: 'Charlie',
          assessments: ['fit'],
          totalAmount: 1000,
          sessionId: 'sess_abc123456789',
        },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.html).toContain('£10.00');
    });

    it('falls back to Gmail for contact (demo)', async () => {
      await mod.handleEmailJob({
        type: 'contact',
        payload: {
          name: 'Prospect',
          email: 'prospect@corp.com',
          company: 'BigCorp',
          message: 'Demo please',
          intent: 'demo',
        },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('hello@humanmetrix.co.uk');
      expect(mailOpts.subject).toContain('Demo Request');
    });

    it('falls back to Gmail for contact (sales)', async () => {
      await mod.handleEmailJob({
        type: 'contact',
        payload: {
          name: 'Buyer',
          email: 'buyer@corp.com',
          company: 'SmallCo',
          message: 'Pricing?',
          intent: 'sales',
        },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.subject).toContain('Sales Inquiry');
    });

    it('throws unknown email type via Gmail fallback', async () => {
      await expect(
        mod.handleEmailJob({ type: 'unknown' as any, payload: {} })
      ).rejects.toThrow('Unknown email type: unknown');
    });
  });

  describe('Gmail not configured', () => {
    it('throws when Gmail env vars are missing and SendGrid fails', async () => {
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      mockSend.mockRejectedValue(new Error('SendGrid failed'));
      await expect(
        mod.handleEmailJob({
          type: 'password_reset',
          payload: { email: 'a@b.com', name: 'A', resetToken: 'x' },
        })
      ).rejects.toThrow('Gmail not configured for fallback');
    });
  });

  describe('getSendGridClient edge cases', () => {
    it('throws when no identity tokens available', async () => {
      delete process.env.REPL_IDENTITY;
      delete process.env.WEB_REPL_RENEWAL;
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await expect(
        mod.handleEmailJob({ type: 'password_reset', payload: { email: 'a@b.com', name: 'A', resetToken: 'x' } })
      ).rejects.toThrow();
    });

    it('uses WEB_REPL_RENEWAL when REPL_IDENTITY is missing', async () => {
      delete process.env.REPL_IDENTITY;
      process.env.WEB_REPL_RENEWAL = 'depl-token';
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'x' },
      });
      const fetchCall = (globalThis.fetch as any).mock.calls[0];
      expect(fetchCall[1].headers['X_REPLIT_TOKEN']).toBe('depl depl-token');
    });

    it('throws when SendGrid connector returns no items', async () => {
      setupFetchMock({ items: [] });
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await expect(
        mod.handleEmailJob({ type: 'password_reset', payload: { email: 'a@b.com', name: 'A', resetToken: 'x' } })
      ).rejects.toThrow();
    });

    it('throws when SendGrid settings missing api_key', async () => {
      setupFetchMock({ items: [{ settings: { from_email: 'x@y.com' } }] });
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await expect(
        mod.handleEmailJob({ type: 'password_reset', payload: { email: 'a@b.com', name: 'A', resetToken: 'x' } })
      ).rejects.toThrow();
    });

    it('throws when SendGrid settings missing from_email', async () => {
      setupFetchMock({ items: [{ settings: { api_key: 'key' } }] });
      delete process.env.GMAIL_USER;
      delete process.env.GMAIL_APP_PASSWORD;
      await expect(
        mod.handleEmailJob({ type: 'password_reset', payload: { email: 'a@b.com', name: 'A', resetToken: 'x' } })
      ).rejects.toThrow();
    });

    it('falls back to Gmail when SendGrid connector returns no items but Gmail is configured', async () => {
      setupFetchMock({ items: [] });
      const result = await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'x' },
      });
      expect(mockSendMail).toHaveBeenCalled();
      expect(result).toEqual({ messageId: 'gmail-msg-id' });
    });
  });

  describe('getBaseUrl', () => {
    it('uses PRODUCTION_URL when set', async () => {
      process.env.PRODUCTION_URL = 'https://humanmetrix.co.uk/';
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'tok' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://humanmetrix.co.uk/reset-password/tok');
    });

    it('strips trailing slash from PRODUCTION_URL', async () => {
      process.env.PRODUCTION_URL = 'https://example.com/';
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'tok' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://example.com/reset-password/tok');
      expect(msg.html).not.toContain('https://example.com//reset-password/tok');
    });

    it('uses REPLIT_DOMAINS when PRODUCTION_URL not set', async () => {
      delete process.env.PRODUCTION_URL;
      process.env.REPLIT_DOMAINS = 'myapp.repl.co,other.repl.co';
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'tok' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://myapp.repl.co/reset-password/tok');
    });

    it('falls back to localhost when neither set', async () => {
      delete process.env.PRODUCTION_URL;
      delete process.env.REPLIT_DOMAINS;
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'tok' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('http://localhost:5000/reset-password/tok');
    });
  });

  describe('formatCurrencyAmount', () => {
    it('formats GBP correctly', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 1234, sessionId: 'sess_abcdef123456', currency: 'gbp' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('£12.34');
    });

    it('formats USD correctly', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 999, sessionId: 'sess_abcdef123456', currency: 'usd' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('$9.99');
    });

    it('formats EUR correctly', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 500, sessionId: 'sess_abcdef123456', currency: 'eur' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('€5.00');
    });

    it('formats JPY correctly', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 10000, sessionId: 'sess_abcdef123456', currency: 'jpy' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('¥100.00');
    });

    it('formats unknown currency with uppercase code', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 2000, sessionId: 'sess_abcdef123456', currency: 'xyz' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('XYZ 20.00');
    });

    it('formats CHF correctly', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit'], totalAmount: 7500, sessionId: 'sess_abcdef123456', currency: 'chf' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('CHF 75.00');
    });
  });

  describe('formatAssessmentName', () => {
    it('maps known types in receipt emails', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['fit', 'ai_readiness', 'prompt_architecture', 'aiq'], totalAmount: 1000, sessionId: 'sess_abcdef123456' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('FIT Assessment');
      expect(msg.html).toContain('AI Readiness Assessment');
      expect(msg.html).toContain('Prompt Architecture Assessment');
      expect(msg.html).toContain('AIQ Assessment');
    });

    it('returns unknown type as-is', async () => {
      await mod.handleEmailJob({
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'A', assessments: ['unknown_type'], totalAmount: 1000, sessionId: 'sess_abcdef123456' },
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('unknown_type');
    });
  });

  describe('async wrapper functions', () => {
    it('sendInvitationEmailAsync enqueues correctly', async () => {
      const result = await mod.sendInvitationEmailAsync(mockInvitation, 'John');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'invitation',
        payload: { invitation: mockInvitation, inviterName: 'John' },
      });
      expect(result).toBe('job_123');
    });

    it('sendPasswordResetEmailAsync enqueues correctly', async () => {
      const result = await mod.sendPasswordResetEmailAsync('a@b.com', 'Alice', 'tok');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'Alice', resetToken: 'tok' },
      });
      expect(result).toBe('job_123');
    });

    it('sendWelcomeEmailAsync enqueues correctly without note', async () => {
      await mod.sendWelcomeEmailAsync('a@b.com', 'Alice', 'tmp');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'welcome',
        payload: { email: 'a@b.com', name: 'Alice', temporaryPassword: 'tmp', note: undefined },
      });
    });

    it('sendWelcomeEmailAsync enqueues correctly with note', async () => {
      await mod.sendWelcomeEmailAsync('a@b.com', 'Alice', 'tmp', 'A note');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'welcome',
        payload: { email: 'a@b.com', name: 'Alice', temporaryPassword: 'tmp', note: 'A note' },
      });
    });

    it('sendPaymentReceiptEmailAsync enqueues correctly', async () => {
      await mod.sendPaymentReceiptEmailAsync('a@b.com', 'Alice', ['fit'], 5000, 'sess_123', 'usd');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'Alice', assessments: ['fit'], totalAmount: 5000, sessionId: 'sess_123', currency: 'usd' },
      });
    });

    it('sendPaymentReceiptEmailAsync uses default gbp currency', async () => {
      await mod.sendPaymentReceiptEmailAsync('a@b.com', 'Alice', ['fit'], 5000, 'sess_123');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'receipt',
        payload: { email: 'a@b.com', name: 'Alice', assessments: ['fit'], totalAmount: 5000, sessionId: 'sess_123', currency: 'gbp' },
      });
    });

    it('sendContactFormEmailAsync enqueues correctly', async () => {
      await mod.sendContactFormEmailAsync('Bob', 'bob@corp.com', 'Corp', 'Hello', 'demo');
      expect(mockEnqueue).toHaveBeenCalledWith('email', {
        type: 'contact',
        payload: { name: 'Bob', email: 'bob@corp.com', company: 'Corp', message: 'Hello', intent: 'demo' },
      });
    });
  });

  describe('sendViaGmail', () => {
    beforeEach(() => {
      mockSend.mockRejectedValue(new Error('SendGrid fail'));
    });

    it('sends email with replyTo when provided (contact via Gmail fallback)', async () => {
      await mod.handleEmailJob({
        type: 'contact',
        payload: { name: 'Bob', email: 'bob@test.com', company: 'Co', message: 'Hi', intent: 'demo' },
      });
      expect(mockCreateTransport).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalled();
    });

    it('does not include replyTo for non-contact emails via Gmail', async () => {
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'x' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.replyTo).toBeUndefined();
    });

    it('sets from field with Gmail user', async () => {
      await mod.handleEmailJob({
        type: 'password_reset',
        payload: { email: 'a@b.com', name: 'A', resetToken: 'x' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.from).toContain('test@gmail.com');
      expect(mailOpts.from).toContain('HumanMetrix');
    });
  });

  describe('HTML and text builder output', () => {
    describe('invitation builders', () => {
      it('HTML contains candidate name, inviter, assessments, invite URL', async () => {
        await mod.handleEmailJob({
          type: 'invitation',
          payload: { invitation: mockInvitation, inviterName: 'John Smith' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('Jane Doe');
        expect(msg.html).toContain('John Smith');
        expect(msg.html).toContain('FIT Assessment');
        expect(msg.html).toContain('AIQ Assessment');
        expect(msg.html).toContain('/invite/tok123');
        expect(msg.html).toContain('Good luck!');
        expect(msg.html).toContain('<!DOCTYPE html>');
      });

      it('text contains candidate name, inviter, assessments, invite URL', async () => {
        await mod.handleEmailJob({
          type: 'invitation',
          payload: { invitation: mockInvitation, inviterName: 'John Smith' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('Jane Doe');
        expect(msg.text).toContain('John Smith');
        expect(msg.text).toContain('FIT Assessment, AIQ Assessment');
        expect(msg.text).toContain('/invite/tok123');
        expect(msg.text).toContain('Good luck!');
      });
    });

    describe('password reset builders', () => {
      it('HTML contains name and reset URL', async () => {
        await mod.handleEmailJob({
          type: 'password_reset',
          payload: { email: 'a@b.com', name: 'TestUser', resetToken: 'reset-abc' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('TestUser');
        expect(msg.html).toContain('/reset-password/reset-abc');
        expect(msg.html).toContain('Security Notice');
      });

      it('text contains name and reset URL', async () => {
        await mod.handleEmailJob({
          type: 'password_reset',
          payload: { email: 'a@b.com', name: 'TestUser', resetToken: 'reset-abc' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('TestUser');
        expect(msg.text).toContain('/reset-password/reset-abc');
        expect(msg.text).toContain('expire in 1 hour');
      });
    });

    describe('welcome builders', () => {
      it('HTML contains name, email, password, login URL', async () => {
        await mod.handleEmailJob({
          type: 'welcome',
          payload: { email: 'test@x.com', name: 'WelcomeUser', temporaryPassword: 'pass123' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('WelcomeUser');
        expect(msg.html).toContain('test@x.com');
        expect(msg.html).toContain('pass123');
        expect(msg.html).toContain('Welcome to HumanMetrix');
      });

      it('text contains name, email, password, login URL without note', async () => {
        await mod.handleEmailJob({
          type: 'welcome',
          payload: { email: 'test@x.com', name: 'WelcomeUser', temporaryPassword: 'pass123' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('WelcomeUser');
        expect(msg.text).toContain('test@x.com');
        expect(msg.text).toContain('pass123');
        expect(msg.text).not.toContain('Note:');
      });

      it('text contains note when provided', async () => {
        await mod.handleEmailJob({
          type: 'welcome',
          payload: { email: 'test@x.com', name: 'WelcomeUser', temporaryPassword: 'pass123', note: 'Please hurry' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('Note: "Please hurry"');
      });

      it('HTML contains note-box when note provided', async () => {
        await mod.handleEmailJob({
          type: 'welcome',
          payload: { email: 'test@x.com', name: 'WelcomeUser', temporaryPassword: 'pass123', note: 'Check this' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('note-box');
        expect(msg.html).toContain('Check this');
      });

      it('HTML does not contain note div when no note', async () => {
        await mod.handleEmailJob({
          type: 'welcome',
          payload: { email: 'test@x.com', name: 'WelcomeUser', temporaryPassword: 'pass123' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).not.toContain('class="note-box"');
      });
    });

    describe('receipt builders', () => {
      it('HTML contains name, assessments, amount, session reference', async () => {
        await mod.handleEmailJob({
          type: 'receipt',
          payload: { email: 'a@b.com', name: 'Buyer', assessments: ['fit'], totalAmount: 5000, sessionId: 'sess_abcdef123456', currency: 'gbp' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('Buyer');
        expect(msg.html).toContain('FIT Assessment');
        expect(msg.html).toContain('£50.00');
        expect(msg.html).toContain('Payment Successful');
      });

      it('text contains name, assessments, amount, session reference', async () => {
        await mod.handleEmailJob({
          type: 'receipt',
          payload: { email: 'a@b.com', name: 'Buyer', assessments: ['fit'], totalAmount: 5000, sessionId: 'sess_abcdef123456', currency: 'gbp' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('Buyer');
        expect(msg.text).toContain('FIT Assessment');
        expect(msg.text).toContain('£50.00');
      });
    });

    describe('contact builders', () => {
      it('HTML contains name, email, company, message with newline conversion, intent label', async () => {
        await mod.handleEmailJob({
          type: 'contact',
          payload: { name: 'Contact', email: 'c@d.com', company: 'TestCo', message: 'Hello\nWorld', intent: 'demo' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.html).toContain('Contact');
        expect(msg.html).toContain('c@d.com');
        expect(msg.html).toContain('TestCo');
        expect(msg.html).toContain('Hello<br>World');
        expect(msg.html).toContain('Demo Request');
        expect(msg.html).toContain('DEMO REQUEST');
      });

      it('text contains name, email, company, message, intent label', async () => {
        await mod.handleEmailJob({
          type: 'contact',
          payload: { name: 'Contact', email: 'c@d.com', company: 'TestCo', message: 'Hello', intent: 'sales' },
        });
        const msg = mockSend.mock.calls[0][0];
        expect(msg.text).toContain('Contact');
        expect(msg.text).toContain('c@d.com');
        expect(msg.text).toContain('TestCo');
        expect(msg.text).toContain('Hello');
        expect(msg.text).toContain('Sales Inquiry');
        expect(msg.text).toContain('SALES INQUIRY');
      });
    });
  });

  describe('Gmail fallback HTML/text builders', () => {
    beforeEach(() => {
      mockSend.mockRejectedValue(new Error('SendGrid fail'));
    });

    it('invitation via Gmail without message has no message block', async () => {
      await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitationNoMessage, inviterName: 'John' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.html).toContain('Jane Doe');
      expect(mailOpts.html).toContain('John');
      expect(mailOpts.html).not.toContain('border-left:4px solid #667eea');
      expect(mailOpts.text).toContain('Jane Doe');
      expect(mailOpts.text).not.toContain('Message:');
    });

    it('invitation via Gmail with message includes message block', async () => {
      await mod.handleEmailJob({
        type: 'invitation',
        payload: { invitation: mockInvitation, inviterName: 'John' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.html).toContain('Good luck!');
      expect(mailOpts.text).toContain('Good luck!');
    });

    it('welcome via Gmail without note produces correct text', async () => {
      await mod.handleEmailJob({
        type: 'welcome',
        payload: { email: 'a@b.com', name: 'A', temporaryPassword: 'p' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.text).not.toContain('Note:');
      expect(mailOpts.html).not.toContain('class="note-box"');
    });

    it('welcome via Gmail with note produces correct text', async () => {
      await mod.handleEmailJob({
        type: 'welcome',
        payload: { email: 'a@b.com', name: 'A', temporaryPassword: 'p', note: 'Hi there' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.text).toContain('Note: "Hi there"');
      expect(mailOpts.html).toContain('Hi there');
    });

    it('contact via Gmail sends to sales email', async () => {
      await mod.handleEmailJob({
        type: 'contact',
        payload: { name: 'N', email: 'e@e.com', company: 'C', message: 'M', intent: 'sales' },
      });
      const mailOpts = mockSendMail.mock.calls[0][0];
      expect(mailOpts.to).toBe('hello@humanmetrix.co.uk');
      expect(mailOpts.subject).toContain('Sales Inquiry');
    });
  });
});
