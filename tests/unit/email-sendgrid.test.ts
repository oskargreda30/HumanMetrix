import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockSend = vi.fn();
const mockSetApiKey = vi.fn();

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: (...args: any[]) => mockSetApiKey(...args),
    send: (...args: any[]) => mockSend(...args),
  },
}));

vi.mock('../../server/generateReceipt', () => ({
  generateReceiptPDF: vi.fn(),
  generateInvoiceReceiptNumber: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function setupFetchSuccess(apiKey = 'test-api-key', fromEmail = 'test@example.com') {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({
      items: [{
        settings: { api_key: apiKey, from_email: fromEmail },
      }],
    }),
  });
}

function setupFetchMissingItems() {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({ items: [] }),
  });
}

function setupFetchMissingApiKey() {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({
      items: [{ settings: { from_email: 'test@example.com' } }],
    }),
  });
}

function setupFetchMissingFromEmail() {
  mockFetch.mockResolvedValue({
    json: () => Promise.resolve({
      items: [{ settings: { api_key: 'test-key' } }],
    }),
  });
}

function setupSendSuccess(messageId = 'msg-123') {
  mockSend.mockResolvedValue([{ headers: { 'x-message-id': messageId } }]);
}

function setupSendFailure(msg = 'Send failed') {
  mockSend.mockRejectedValue(new Error(msg));
}

const savedEnv: Record<string, string | undefined> = {};

function saveAndSetEnv(vars: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(vars)) {
    savedEnv[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

function restoreEnv() {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

import {
  initializeEmailSystem,
  sendPartnerEmail,
  sendInvitationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmailWithPassword,
  sendEmailVerificationCode,
  notifyCriticalError,
  notifySuperAdmins,
  sendEmail,
} from '../../server/email-sendgrid';

describe('email-sendgrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveAndSetEnv({
      REPLIT_CONNECTORS_HOSTNAME: 'connectors.test',
      REPL_IDENTITY: 'test-identity',
      WEB_REPL_RENEWAL: undefined,
      REPLIT_DOMAINS: undefined,
      SUPER_ADMIN_EMAILS: undefined,
    });
  });

  afterEach(() => {
    restoreEnv();
  });

  describe('formatAssessmentName (tested via sendInvitationEmail)', () => {
    beforeEach(() => {
      setupFetchSuccess();
      setupSendSuccess();
    });

    it('maps fit to FIT Assessment', async () => {
      const invitation = {
        id: 1, candidateEmail: 'c@test.com', candidateName: 'Test',
        assessmentTypes: ['fit'], token: 'tok', message: null,
        expiresAt: new Date(), status: 'pending' as const,
        invitedBy: 1, createdAt: new Date(), completedAt: null,
        organizationId: null,
      };
      await sendInvitationEmail(invitation as any, 'Inviter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('FIT Assessment');
    });

    it('maps ai_readiness to AI Readiness Assessment', async () => {
      const invitation = {
        id: 1, candidateEmail: 'c@test.com', candidateName: 'Test',
        assessmentTypes: ['ai_readiness'], token: 'tok', message: null,
        expiresAt: new Date(), status: 'pending' as const,
        invitedBy: 1, createdAt: new Date(), completedAt: null,
        organizationId: null,
      };
      await sendInvitationEmail(invitation as any, 'Inviter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('AI Readiness Assessment');
    });

    it('maps prompt_architecture to Prompt Architecture Assessment', async () => {
      const invitation = {
        id: 1, candidateEmail: 'c@test.com', candidateName: 'Test',
        assessmentTypes: ['prompt_architecture'], token: 'tok', message: null,
        expiresAt: new Date(), status: 'pending' as const,
        invitedBy: 1, createdAt: new Date(), completedAt: null,
        organizationId: null,
      };
      await sendInvitationEmail(invitation as any, 'Inviter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('Prompt Architecture Assessment');
    });

    it('maps aiq to AIQ Assessment', async () => {
      const invitation = {
        id: 1, candidateEmail: 'c@test.com', candidateName: 'Test',
        assessmentTypes: ['aiq'], token: 'tok', message: null,
        expiresAt: new Date(), status: 'pending' as const,
        invitedBy: 1, createdAt: new Date(), completedAt: null,
        organizationId: null,
      };
      await sendInvitationEmail(invitation as any, 'Inviter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('AIQ Assessment');
    });

    it('returns unknown type as-is', async () => {
      const invitation = {
        id: 1, candidateEmail: 'c@test.com', candidateName: 'Test',
        assessmentTypes: ['unknown_type'], token: 'tok', message: null,
        expiresAt: new Date(), status: 'pending' as const,
        invitedBy: 1, createdAt: new Date(), completedAt: null,
        organizationId: null,
      };
      await sendInvitationEmail(invitation as any, 'Inviter');
      const call = mockSend.mock.calls[0][0];
      expect(call.html).toContain('unknown_type');
    });
  });

  describe('getCredentials (tested via getSendGridClient calls)', () => {
    it('uses REPL_IDENTITY token path', async () => {
      saveAndSetEnv({ REPL_IDENTITY: 'my-identity', WEB_REPL_RENEWAL: undefined });
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers['X_REPLIT_TOKEN']).toBe('repl my-identity');
    });

    it('uses WEB_REPL_RENEWAL token path when REPL_IDENTITY is absent', async () => {
      saveAndSetEnv({ REPL_IDENTITY: undefined, WEB_REPL_RENEWAL: 'my-renewal' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      const fetchCall = mockFetch.mock.calls[0];
      expect(fetchCall[1].headers['X_REPLIT_TOKEN']).toBe('depl my-renewal');
    });

    it('throws when neither REPL_IDENTITY nor WEB_REPL_RENEWAL exists', async () => {
      saveAndSetEnv({ REPL_IDENTITY: undefined, WEB_REPL_RENEWAL: undefined });
      const result = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      expect(result.success).toBe(false);
    });

    it('throws when connection settings are missing (empty items)', async () => {
      setupFetchMissingItems();
      const result = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      expect(result.success).toBe(false);
    });

    it('throws when api_key is missing', async () => {
      setupFetchMissingApiKey();
      const result = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      expect(result.success).toBe(false);
    });

    it('throws when from_email is missing', async () => {
      setupFetchMissingFromEmail();
      const result = await sendEmail({ to: 'a@b.com', subject: 's', html: '<p>h</p>' });
      expect(result.success).toBe(false);
    });
  });

  describe('initializeEmailSystem', () => {
    it('succeeds when credentials are valid', async () => {
      setupFetchSuccess();
      const logSpy = vi.spyOn(console, 'log');
      await initializeEmailSystem();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Initializing SendGrid'));
      expect(mockSetApiKey).toHaveBeenCalledWith('test-api-key');
    });

    it('handles failure gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const errorSpy = vi.spyOn(console, 'error');
      await initializeEmailSystem();
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('SendGrid initialization failed'), 'Network error');
    });
  });

  describe('sendPartnerEmail', () => {
    it('sends email successfully and returns messageId', async () => {
      setupFetchSuccess();
      setupSendSuccess('partner-msg-id');
      const result = await sendPartnerEmail({
        to: 'partner@test.com',
        subject: 'Partner Subject',
        html: '<p>Partner content</p>',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('partner-msg-id');
      expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
        to: 'partner@test.com',
        subject: 'Partner Subject',
      }));
    });

    it('strips HTML for text when text is not provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendPartnerEmail({
        to: 'p@t.com', subject: 's', html: '<p>Hello</p>',
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.text).toBe('Hello');
    });

    it('uses provided text when given', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendPartnerEmail({
        to: 'p@t.com', subject: 's', html: '<p>Hello</p>', text: 'Custom text',
      });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.text).toBe('Custom text');
    });

    it('returns failure on error', async () => {
      setupFetchSuccess();
      setupSendFailure();
      const result = await sendPartnerEmail({
        to: 'p@t.com', subject: 's', html: '<p>h</p>',
      });
      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('sendInvitationEmail', () => {
    const makeInvitation = (overrides: Record<string, any> = {}) => ({
      id: 1,
      candidateEmail: 'candidate@test.com',
      candidateName: 'John Doe',
      assessmentTypes: ['fit', 'aiq'],
      token: 'invite-token-123',
      message: null,
      expiresAt: new Date('2026-12-31'),
      status: 'pending' as const,
      invitedBy: 1,
      createdAt: new Date(),
      completedAt: null,
      organizationId: null,
      ...overrides,
    });

    it('sends invitation email successfully', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendInvitationEmail(makeInvitation() as any, 'Admin User');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('candidate@test.com');
      expect(msg.subject).toContain('Admin User');
      expect(msg.html).toContain('John Doe');
      expect(msg.html).toContain('FIT Assessment');
      expect(msg.html).toContain('AIQ Assessment');
    });

    it('includes message when present', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendInvitationEmail(makeInvitation({ message: 'Please complete ASAP' }) as any, 'Admin');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('Please complete ASAP');
      expect(msg.text).toContain('Please complete ASAP');
    });

    it('excludes message block when message is null', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendInvitationEmail(makeInvitation({ message: null }) as any, 'Admin');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('border-left: 4px solid');
    });

    it('uses REPLIT_DOMAINS for invite URL', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: 'myapp.replit.app,other.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendInvitationEmail(makeInvitation() as any, 'Admin');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://myapp.replit.app/invite/invite-token-123');
    });

    it('uses localhost when REPLIT_DOMAINS is not set', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: undefined });
      setupFetchSuccess();
      setupSendSuccess();
      await sendInvitationEmail(makeInvitation() as any, 'Admin');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('http://localhost:5000/invite/invite-token-123');
    });

    it('handles send failure gracefully', async () => {
      setupFetchSuccess();
      setupSendFailure('Invitation send error');
      await sendInvitationEmail(makeInvitation() as any, 'Admin');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('sends reset email successfully', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendPasswordResetEmail('user@test.com', 'User', 'reset-tok');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('user@test.com');
      expect(msg.subject).toContain('Reset Your Password');
      expect(msg.html).toContain('User');
    });

    it('uses REPLIT_DOMAINS for reset URL', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: 'myapp.replit.app' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendPasswordResetEmail('u@t.com', 'U', 'tok');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://myapp.replit.app/reset-password/tok');
    });

    it('uses localhost when REPLIT_DOMAINS is not set', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: undefined });
      setupFetchSuccess();
      setupSendSuccess();
      await sendPasswordResetEmail('u@t.com', 'U', 'tok');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('http://localhost:5000/reset-password/tok');
    });

    it('handles send failure gracefully', async () => {
      setupFetchSuccess();
      setupSendFailure();
      await sendPasswordResetEmail('u@t.com', 'U', 'tok');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendWelcomeEmailWithPassword', () => {
    it('sends welcome email successfully', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('new@test.com', 'New User', 'temp123');
      expect(mockSend).toHaveBeenCalledTimes(1);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toBe('new@test.com');
      expect(msg.subject).toContain('Welcome');
      expect(msg.html).toContain('New User');
      expect(msg.html).toContain('temp123');
    });

    it('includes note when provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass', 'Important note');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('Important note');
      expect(msg.text).toContain('Important note');
    });

    it('excludes note section when note is not provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('<strong>Note:</strong>');
    });

    it('uses auto-login URL when autoLoginToken is provided', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: 'app.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass', undefined, 'auto-tok');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://app.com/auto-login/auto-tok');
    });

    it('uses regular login URL when autoLoginToken is not provided', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: 'app.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://app.com/login');
    });

    it('uses REPLIT_DOMAINS for base URL', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: 'myapp.replit.app' });
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('https://myapp.replit.app/login');
    });

    it('uses localhost when REPLIT_DOMAINS is not set', async () => {
      saveAndSetEnv({ REPLIT_DOMAINS: undefined });
      setupFetchSuccess();
      setupSendSuccess();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('http://localhost:5000/login');
    });

    it('handles send failure gracefully', async () => {
      setupFetchSuccess();
      setupSendFailure();
      await sendWelcomeEmailWithPassword('n@t.com', 'N', 'pass');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendEmailVerificationCode', () => {
    it('sends verification code successfully with name', async () => {
      setupFetchSuccess();
      setupSendSuccess('verify-msg-id');
      const result = await sendEmailVerificationCode('v@t.com', '123456', 'John');
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('verify-msg-id');
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('123456');
      expect(msg.html).toContain('Hello John');
      expect(msg.html).toContain('123456');
    });

    it('sends verification code successfully without name', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      const result = await sendEmailVerificationCode('v@t.com', '654321');
      expect(result.success).toBe(true);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('Hello,');
      expect(msg.html).not.toContain('Hello ,');
    });

    it('returns failure on error', async () => {
      setupFetchSuccess();
      setupSendFailure();
      const result = await sendEmailVerificationCode('v@t.com', '123');
      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
    });
  });

  describe('notifyCriticalError', () => {
    const baseDetails = {
      errorType: 'DatabaseError',
      errorMessage: 'Connection lost',
      source: 'api-server',
    };

    it('sends critical error notification successfully', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin1@t.com,admin2@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      const result = await notifyCriticalError(baseDetails);
      expect(result.success).toBe(true);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toEqual(['admin1@t.com', 'admin2@t.com']);
      expect(msg.subject).toContain('[CRITICAL]');
      expect(msg.subject).toContain('DatabaseError');
      expect(msg.html).toContain('Connection lost');
    });

    it('returns failure when no super admin emails configured', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: undefined });
      setupFetchSuccess();
      const result = await notifyCriticalError(baseDetails);
      expect(result.success).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('includes context when provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifyCriticalError({ ...baseDetails, context: { userId: 123 } });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('"userId": 123');
    });

    it('excludes context section when not provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifyCriticalError(baseDetails);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('Context');
    });

    it('includes stack trace when provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifyCriticalError({ ...baseDetails, stackTrace: 'Error at line 5\n  at foo()' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('Error at line 5');
      expect(msg.text).toContain('Error at line 5');
    });

    it('excludes stack trace section when not provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifyCriticalError(baseDetails);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('Stack Trace');
    });

    it('returns failure on send error', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendFailure();
      const result = await notifyCriticalError(baseDetails);
      expect(result.success).toBe(false);
    });
  });

  describe('notifySuperAdmins', () => {
    const baseDetails = {
      subject: 'Test Notification',
      message: 'Something happened',
    };

    it('sends notification successfully', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'admin@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      const result = await notifySuperAdmins(baseDetails);
      expect(result.success).toBe(true);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('[MEDIUM]');
      expect(msg.html).toContain('Something happened');
    });

    it('returns failure when no super admin emails configured', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: undefined });
      setupFetchSuccess();
      const result = await notifySuperAdmins(baseDetails);
      expect(result.success).toBe(false);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('uses low priority', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins({ ...baseDetails, priority: 'low' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('[LOW]');
      expect(msg.html).toContain('#22c55e');
    });

    it('uses high priority', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins({ ...baseDetails, priority: 'high' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('[HIGH]');
      expect(msg.html).toContain('#f97316');
    });

    it('uses critical priority', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins({ ...baseDetails, priority: 'critical' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('[CRITICAL]');
      expect(msg.html).toContain('#dc2626');
    });

    it('defaults to medium priority', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins(baseDetails);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.subject).toContain('[MEDIUM]');
      expect(msg.html).toContain('#eab308');
    });

    it('includes context when provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins({ ...baseDetails, context: { key: 'value' } });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).toContain('"key": "value"');
    });

    it('excludes context when not provided', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendSuccess();
      await notifySuperAdmins(baseDetails);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.html).not.toContain('<pre');
    });

    it('returns failure on send error', async () => {
      saveAndSetEnv({ SUPER_ADMIN_EMAILS: 'a@t.com' });
      setupFetchSuccess();
      setupSendFailure();
      const result = await notifySuperAdmins(baseDetails);
      expect(result.success).toBe(false);
    });
  });

  describe('sendEmail', () => {
    it('sends email successfully with string "to"', async () => {
      setupFetchSuccess();
      setupSendSuccess('email-msg-id');
      const result = await sendEmail({
        to: 'user@test.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('email-msg-id');
    });

    it('sends email successfully with array "to"', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      const result = await sendEmail({
        to: ['a@t.com', 'b@t.com'],
        subject: 'Test',
        html: '<p>Hello</p>',
      });
      expect(result.success).toBe(true);
      const msg = mockSend.mock.calls[0][0];
      expect(msg.to).toEqual(['a@t.com', 'b@t.com']);
    });

    it('strips HTML for text when text is not provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@t.com', subject: 's', html: '<b>Bold</b>' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.text).toBe('Bold');
    });

    it('uses provided text', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@t.com', subject: 's', html: '<p>h</p>', text: 'Custom' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.text).toBe('Custom');
    });

    it('includes attachments when provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      const attachments = [{ content: 'base64data', filename: 'file.pdf', type: 'application/pdf' }];
      await sendEmail({ to: 'a@t.com', subject: 's', html: '<p>h</p>', attachments });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.attachments).toEqual(attachments);
    });

    it('does not include attachments when empty array', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@t.com', subject: 's', html: '<p>h</p>', attachments: [] });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.attachments).toBeUndefined();
    });

    it('does not include attachments when not provided', async () => {
      setupFetchSuccess();
      setupSendSuccess();
      await sendEmail({ to: 'a@t.com', subject: 's', html: '<p>h</p>' });
      const msg = mockSend.mock.calls[0][0];
      expect(msg.attachments).toBeUndefined();
    });

    it('returns failure on error', async () => {
      setupFetchSuccess();
      setupSendFailure();
      const result = await sendEmail({ to: 'a@t.com', subject: 's', html: '<p>h</p>' });
      expect(result.success).toBe(false);
      expect(result.messageId).toBeUndefined();
    });
  });
});
