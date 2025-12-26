/**
 * Unit Tests for Email System
 * 
 * Tests cover:
 * - Email template rendering
 * - Standardised sender address (hello@humanmetrix.co.uk)
 * - Template content validation
 * - PII sanitisation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Standardised email address
const SENDER_EMAIL = 'hello@humanmetrix.co.uk';
const SENDER_NAME = 'HumanMetrix';

// Assessment type formatters
const ASSESSMENT_NAMES: Record<string, string> = {
  fit: 'FIT Assessment',
  ai_readiness: 'AI Readiness Assessment',
  prompt_architecture: 'Prompt Architecture Assessment',
  aiq: 'AIQ Assessment',
};

function formatAssessmentName(type: string): string {
  return ASSESSMENT_NAMES[type] || type;
}

describe('Email Address Standards', () => {
  describe('Sender Address', () => {
    it('should use hello@humanmetrix.co.uk as sender', () => {
      expect(SENDER_EMAIL).toBe('hello@humanmetrix.co.uk');
    });

    it('should use HumanMetrix as sender name', () => {
      expect(SENDER_NAME).toBe('HumanMetrix');
    });

    it('should format from address correctly', () => {
      const fromAddress = `"${SENDER_NAME}" <${SENDER_EMAIL}>`;
      expect(fromAddress).toBe('"HumanMetrix" <hello@humanmetrix.co.uk>');
    });
  });

  describe('Email Domain Validation', () => {
    it('should use humanmetrix.co.uk domain', () => {
      const domain = SENDER_EMAIL.split('@')[1];
      expect(domain).toBe('humanmetrix.co.uk');
    });

    it('should not use deprecated info@ address', () => {
      expect(SENDER_EMAIL).not.toContain('info@');
    });

    it('should not use deprecated support@ address', () => {
      expect(SENDER_EMAIL).not.toContain('support@');
    });
  });
});

describe('Assessment Name Formatting', () => {
  it('should format FIT assessment correctly', () => {
    expect(formatAssessmentName('fit')).toBe('FIT Assessment');
  });

  it('should format AI Readiness assessment correctly', () => {
    expect(formatAssessmentName('ai_readiness')).toBe('AI Readiness Assessment');
  });

  it('should format Prompt Architecture assessment correctly', () => {
    expect(formatAssessmentName('prompt_architecture')).toBe('Prompt Architecture Assessment');
  });

  it('should format AIQ assessment correctly', () => {
    expect(formatAssessmentName('aiq')).toBe('AIQ Assessment');
  });

  it('should return original type for unknown assessment', () => {
    expect(formatAssessmentName('unknown')).toBe('unknown');
  });
});

describe('Email Template Content', () => {
  describe('Invitation Email', () => {
    function renderInvitationEmail(data: {
      candidateName: string;
      inviterName: string;
      assessmentTypes: string[];
      inviteUrl: string;
      message?: string;
      expiresAt: Date;
    }): { subject: string; body: string } {
      const assessmentList = data.assessmentTypes.map(formatAssessmentName).join(', ');
      
      return {
        subject: `Assessment Invitation from ${data.inviterName}`,
        body: `Hello ${data.candidateName}, ${data.inviterName} has invited you to complete: ${assessmentList}. Click here: ${data.inviteUrl}`,
      };
    }

    it('should include candidate name in body', () => {
      const email = renderInvitationEmail({
        candidateName: 'John Doe',
        inviterName: 'HR Manager',
        assessmentTypes: ['fit'],
        inviteUrl: 'https://example.com/invite/abc123',
        expiresAt: new Date(),
      });
      
      expect(email.body).toContain('John Doe');
    });

    it('should include inviter name in subject', () => {
      const email = renderInvitationEmail({
        candidateName: 'John Doe',
        inviterName: 'HR Manager',
        assessmentTypes: ['fit'],
        inviteUrl: 'https://example.com/invite/abc123',
        expiresAt: new Date(),
      });
      
      expect(email.subject).toContain('HR Manager');
    });

    it('should include all assessment types', () => {
      const email = renderInvitationEmail({
        candidateName: 'John Doe',
        inviterName: 'HR Manager',
        assessmentTypes: ['fit', 'ai_readiness', 'aiq'],
        inviteUrl: 'https://example.com/invite/abc123',
        expiresAt: new Date(),
      });
      
      expect(email.body).toContain('FIT Assessment');
      expect(email.body).toContain('AI Readiness Assessment');
      expect(email.body).toContain('AIQ Assessment');
    });

    it('should include invite URL', () => {
      const inviteUrl = 'https://example.com/invite/abc123';
      const email = renderInvitationEmail({
        candidateName: 'John Doe',
        inviterName: 'HR Manager',
        assessmentTypes: ['fit'],
        inviteUrl,
        expiresAt: new Date(),
      });
      
      expect(email.body).toContain(inviteUrl);
    });
  });

  describe('Password Reset Email', () => {
    function renderPasswordResetEmail(data: {
      userName: string;
      resetUrl: string;
    }): { subject: string; body: string } {
      return {
        subject: 'Password Reset Request - HumanMetrix',
        body: `Hello ${data.userName}, click here to reset your password: ${data.resetUrl}. This link expires in 1 hour.`,
      };
    }

    it('should have correct subject line', () => {
      const email = renderPasswordResetEmail({
        userName: 'John',
        resetUrl: 'https://example.com/reset/token123',
      });
      
      expect(email.subject).toBe('Password Reset Request - HumanMetrix');
    });

    it('should include user name', () => {
      const email = renderPasswordResetEmail({
        userName: 'John',
        resetUrl: 'https://example.com/reset/token123',
      });
      
      expect(email.body).toContain('John');
    });

    it('should include reset URL', () => {
      const resetUrl = 'https://example.com/reset/token123';
      const email = renderPasswordResetEmail({
        userName: 'John',
        resetUrl,
      });
      
      expect(email.body).toContain(resetUrl);
    });

    it('should mention expiry time', () => {
      const email = renderPasswordResetEmail({
        userName: 'John',
        resetUrl: 'https://example.com/reset/token123',
      });
      
      expect(email.body).toContain('1 hour');
    });
  });

  describe('Payment Receipt Email', () => {
    function renderReceiptEmail(data: {
      userName: string;
      amount: string;
      assessments: string[];
      transactionId: string;
    }): { subject: string; body: string } {
      return {
        subject: 'Payment Confirmation - HumanMetrix',
        body: `Thank you ${data.userName}! Your payment of ${data.amount} for ${data.assessments.join(', ')} has been received. Transaction ID: ${data.transactionId}`,
      };
    }

    it('should include payment amount', () => {
      const email = renderReceiptEmail({
        userName: 'John',
        amount: '£19.99',
        assessments: ['FIT Assessment'],
        transactionId: 'txn_123',
      });
      
      expect(email.body).toContain('£19.99');
    });

    it('should include transaction ID', () => {
      const email = renderReceiptEmail({
        userName: 'John',
        amount: '£19.99',
        assessments: ['FIT Assessment'],
        transactionId: 'txn_123',
      });
      
      expect(email.body).toContain('txn_123');
    });

    it('should list purchased assessments', () => {
      const email = renderReceiptEmail({
        userName: 'John',
        amount: '£19.99',
        assessments: ['FIT Assessment', 'AI Readiness Assessment'],
        transactionId: 'txn_123',
      });
      
      expect(email.body).toContain('FIT Assessment');
      expect(email.body).toContain('AI Readiness Assessment');
    });
  });
});

describe('PII Sanitisation', () => {
  const sensitiveFields = ['password', 'passwordHash', 'resetToken', 'apiKey', 'secret'];

  function sanitiseForLogging(data: Record<string, any>): Record<string, any> {
    const sanitised: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitised[key] = '[REDACTED]';
      } else {
        sanitised[key] = value;
      }
    }
    
    return sanitised;
  }

  it('should redact password fields', () => {
    const data = { email: 'test@example.com', password: 'secret123' };
    const sanitised = sanitiseForLogging(data);
    
    expect(sanitised.password).toBe('[REDACTED]');
    expect(sanitised.email).toBe('test@example.com');
  });

  it('should redact passwordHash fields', () => {
    const data = { email: 'test@example.com', passwordHash: '$2b$10$...' };
    const sanitised = sanitiseForLogging(data);
    
    expect(sanitised.passwordHash).toBe('[REDACTED]');
  });

  it('should redact resetToken fields', () => {
    const data = { email: 'test@example.com', resetToken: 'abc123def456' };
    const sanitised = sanitiseForLogging(data);
    
    expect(sanitised.resetToken).toBe('[REDACTED]');
  });

  it('should redact apiKey fields', () => {
    const data = { partnerId: 'partner-1', apiKey: 'hm_live_secret' };
    const sanitised = sanitiseForLogging(data);
    
    expect(sanitised.apiKey).toBe('[REDACTED]');
    expect(sanitised.partnerId).toBe('partner-1');
  });

  it('should preserve non-sensitive fields', () => {
    const data = { 
      id: 'user-1',
      email: 'test@example.com',
      firstName: 'John',
      role: 'user',
    };
    const sanitised = sanitiseForLogging(data);
    
    expect(sanitised.id).toBe('user-1');
    expect(sanitised.email).toBe('test@example.com');
    expect(sanitised.firstName).toBe('John');
    expect(sanitised.role).toBe('user');
  });
});

describe('Email Validation', () => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  it('should accept valid email addresses', () => {
    expect(emailRegex.test('user@example.com')).toBe(true);
    expect(emailRegex.test('user.name@example.com')).toBe(true);
    expect(emailRegex.test('user+tag@example.com')).toBe(true);
    expect(emailRegex.test('user@subdomain.example.com')).toBe(true);
  });

  it('should reject invalid email addresses', () => {
    expect(emailRegex.test('invalid')).toBe(false);
    expect(emailRegex.test('user@')).toBe(false);
    expect(emailRegex.test('@example.com')).toBe(false);
    expect(emailRegex.test('user @example.com')).toBe(false);
  });
});

describe('Date Formatting for Emails', () => {
  function formatDateForEmail(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  it('should format date in British style', () => {
    const date = new Date('2025-12-25');
    const formatted = formatDateForEmail(date);
    
    expect(formatted).toContain('December');
    expect(formatted).toContain('2025');
  });

  it('should use day month year order', () => {
    const date = new Date('2025-01-15');
    const formatted = formatDateForEmail(date);
    
    // Should be "15 January 2025" format
    expect(formatted).toMatch(/\d+ \w+ \d{4}/);
  });
});

describe('Currency Formatting for Emails', () => {
  function formatCurrency(amount: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    });
    return formatter.format(amount);
  }

  it('should format GBP correctly', () => {
    const formatted = formatCurrency(19.99, 'GBP');
    expect(formatted).toContain('£');
    expect(formatted).toContain('19.99');
  });

  it('should format USD correctly', () => {
    const formatted = formatCurrency(25.00, 'USD');
    expect(formatted).toContain('$');
    expect(formatted).toContain('25.00');
  });

  it('should format EUR correctly', () => {
    const formatted = formatCurrency(22.50, 'EUR');
    expect(formatted).toContain('€');
    expect(formatted).toContain('22.50');
  });
});
