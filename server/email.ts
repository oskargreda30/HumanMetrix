import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import type { Invitation } from '@shared/schema';
import { emailLogs } from '@shared/schema';
import { generateReceiptPDF, generateInvoiceReceiptNumber, type ReceiptData } from './generateReceipt';
import { db } from './db';

// Email logging types
export type RecipientType = 'partner' | 'b2b_test_taker' | 'b2c_customer' | 'super_admin';
export type EmailType = 
  | 'invitation' 
  | 'results' 
  | 'password_reset' 
  | 'welcome' 
  | 'billing' 
  | 'payment_receipt'
  | 'invoice_reminder'
  | 'low_credits'
  | 'credits_added'
  | 'subscription_cancelled'
  | 'subscription_activated'
  | 'partner_signup'
  | 'partner_welcome'
  | 'assessment_complete'
  | 'b2c_assessment_complete'
  | 'trial_ending'
  | 'auto_topup_failed'
  | 'system_notification'
  | 'other';

interface EmailLogParams {
  recipientEmail: string;
  recipientName?: string;
  recipientType: RecipientType;
  subject: string;
  emailType: EmailType;
  provider: 'gmail' | 'sendgrid';
  status: 'sent' | 'failed' | 'bounced';
  messageId?: string;
  error?: string;
  metadata?: Record<string, any>;
}

// Log an email to the database
async function logEmailToDb(params: EmailLogParams): Promise<void> {
  try {
    await db.insert(emailLogs).values({
      recipientEmail: params.recipientEmail,
      recipientName: params.recipientName || null,
      recipientType: params.recipientType,
      subject: params.subject,
      emailType: params.emailType,
      provider: params.provider,
      status: params.status,
      messageId: params.messageId || null,
      error: params.error || null,
      metadata: params.metadata || null,
    });
  } catch (err) {
    console.error('[Email Log] Failed to log email:', err);
    // Don't throw - logging failure shouldn't break email sending
  }
}

// Email provider types
export type EmailProvider = 'sendgrid' | 'gmail';

// SendGrid is always the primary provider, Gmail is the fallback
const currentEmailProvider: EmailProvider = 'sendgrid';

// Get the production base URL - prioritize custom domain over Replit domains
function getBaseUrl(): string {
  // Use custom domain if set (for production with custom domains)
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL.replace(/\/$/, ''); // Remove trailing slash
  }
  // Fall back to Replit domains
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  return domain ? `https://${domain}` : 'http://localhost:5000';
}

// Format assessment type for display (e.g., "fit" -> "FIT Assessment")
function formatAssessmentName(type: string): string {
  const names: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment'
  };
  return names[type] || type;
}

// Gmail/Nodemailer configuration (fallback provider)
let gmailTransporter: nodemailer.Transporter | null = null;
let gmailInitialized = false;

function initGmail(): boolean {
  if (gmailInitialized && gmailTransporter) return true;
  
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;
  
  if (!gmailUser || !gmailPassword) {
    console.warn('[Email] Gmail not configured - GMAIL_USER or GMAIL_APP_PASSWORD missing (fallback unavailable)');
    return false;
  }
  
  try {
    gmailTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });
    gmailInitialized = true;
    console.log('[Email] Gmail ready as fallback provider');
    return true;
  } catch (error: any) {
    console.error('[Email] Gmail initialization failed:', error.message);
    return false;
  }
}

// SendGrid configuration (primary provider)
// WARNING: Never cache the SendGrid client - access tokens expire.
// Always fetch fresh credentials before each send.
let sendGridAvailable = false;
let fromEmail: string = '';

async function getFreshSendGridClient(): Promise<{ client: typeof sgMail; fromEmail: string }> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=sendgrid',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key || !connectionSettings.settings.from_email)) {
    throw new Error('SendGrid not connected - please configure the SendGrid integration');
  }

  sgMail.setApiKey(connectionSettings.settings.api_key);
  fromEmail = connectionSettings.settings.from_email;
  return { client: sgMail, fromEmail };
}

async function initSendGrid(): Promise<boolean> {
  try {
    const { fromEmail } = await getFreshSendGridClient();
    sendGridAvailable = !!fromEmail;
    return sendGridAvailable;
  } catch (error: any) {
    console.error('❌ SendGrid initialization failed:', error.message);
    sendGridAvailable = false;
    return false;
  }
}

function getTransporter() {
  return sendGridAvailable ? sgMail : null;
}

// Initialize email system on startup
export async function initializeEmailSystem() {
  console.log('Initializing email systems...');
  
  // Initialize SendGrid as primary provider
  const sendgridSuccess = await initSendGrid();
  if (sendgridSuccess) {
    console.log('✅ SendGrid ready (primary)');
  }
  
  // Initialize Gmail as fallback provider
  const gmailSuccess = initGmail();
  if (gmailSuccess) {
    console.log('✅ Gmail ready (fallback)');
  }
  
  console.log('📧 Email provider: SendGrid (primary) with Gmail fallback');
}

// Unified email sending function that routes to the correct provider
interface EmailMessage {
  to: string | string[];
  from?: { email: string; name: string };
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
}

// Send email via SendGrid - fetches fresh credentials each time (tokens expire)
async function sendViaSendGrid(msg: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getFreshSendGridClient();
    const sendgridMsg = {
      ...msg,
      from: msg.from || { email: fromEmail, name: 'HumanMetrix' },
    };
    const [response] = await client.send(sendgridMsg as any);
    const messageId = response.headers['x-message-id'];
    return { success: true, messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Send email via Gmail
async function sendViaGmail(msg: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!gmailInitialized || !gmailTransporter) {
    initGmail();
    if (!gmailTransporter) {
      return { success: false, error: 'Gmail not initialized' };
    }
  }
  
  try {
    const gmailUser = process.env.GMAIL_USER;
    const fromName = msg.from?.name || 'HumanMetrix';
    const mailOptions = {
      from: `"${fromName}" <${gmailUser}>`,
      to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      replyTo: msg.replyTo,
      attachments: msg.attachments?.map(att => ({
        filename: att.filename,
        content: Buffer.from(att.content, 'base64'),
        contentType: att.type,
      })),
    };
    
    const info = await gmailTransporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Critical error notification recipients
const criticalErrorRecipients = ['daena@humanmetrix.co.uk', 'oskar@humanmetrix.co.uk'];

// Send failure notification (uses backup provider directly to avoid infinite loop)
async function sendEmailFailureNotification(
  originalMsg: EmailMessage,
  primaryProvider: 'gmail' | 'sendgrid',
  primaryError: string,
  backupProvider: 'gmail' | 'sendgrid',
  backupError?: string
) {
  const subject = `⚠️ Email Delivery Failure Alert`;
  const timestamp = new Date().toISOString();
  const recipientList = Array.isArray(originalMsg.to) ? originalMsg.to.join(', ') : originalMsg.to;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .alert { background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .success { background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
          .detail { background: #f3f4f6; border-radius: 4px; padding: 12px; margin: 8px 0; font-family: monospace; font-size: 12px; }
          h2 { color: #dc2626; }
          .label { font-weight: 600; color: #374151; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Delivery Failure</h2>
          
          <div class="${backupError ? 'alert' : 'warning'}">
            <p><strong>${backupError ? 'Both providers failed' : 'Primary provider failed, backup succeeded'}</strong></p>
          </div>
          
          <p><span class="label">Timestamp:</span> ${timestamp}</p>
          <p><span class="label">Original Subject:</span> ${originalMsg.subject}</p>
          <p><span class="label">Recipient(s):</span> ${recipientList}</p>
          
          <h3>Primary Provider: ${primaryProvider.toUpperCase()}</h3>
          <div class="alert">
            <p><span class="label">Status:</span> Failed</p>
            <p><span class="label">Error:</span></p>
            <div class="detail">${primaryError}</div>
          </div>
          
          <h3>Backup Provider: ${backupProvider.toUpperCase()}</h3>
          ${backupError ? `
            <div class="alert">
              <p><span class="label">Status:</span> Failed</p>
              <p><span class="label">Error:</span></p>
              <div class="detail">${backupError}</div>
            </div>
          ` : `
            <div class="success">
              <p><span class="label">Status:</span> Success - Email delivered via backup</p>
            </div>
          `}
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            This is an automated notification from HumanMetrix email system.
          </p>
        </div>
      </body>
    </html>
  `;
  
  const notificationMsg: EmailMessage = {
    to: criticalErrorRecipients,
    subject,
    html,
    text: `Email Delivery Failure\n\nTimestamp: ${timestamp}\nOriginal Subject: ${originalMsg.subject}\nRecipient(s): ${recipientList}\n\nPrimary (${primaryProvider}): Failed - ${primaryError}\nBackup (${backupProvider}): ${backupError ? `Failed - ${backupError}` : 'Success'}`,
  };
  
  // Try to send notification via whichever provider might work
  // Use the backup provider first (it just worked if backupError is undefined)
  if (!backupError) {
    // Backup worked, use it for notification
    if (backupProvider === 'sendgrid') {
      await sendViaSendGrid(notificationMsg);
    } else {
      await sendViaGmail(notificationMsg);
    }
  } else {
    // Both failed - try both for notification (best effort)
    const result1 = await sendViaSendGrid(notificationMsg);
    if (!result1.success) {
      await sendViaGmail(notificationMsg);
    }
  }
}

// Email logging context for tracking sent emails
interface EmailLogContext {
  recipientType: RecipientType;
  emailType: EmailType;
  recipientName?: string;
  metadata?: Record<string, any>;
}

// Unified email sending with automatic failover and optional logging
async function sendEmail(msg: EmailMessage, logContext?: EmailLogContext): Promise<{ success: boolean; messageId?: string }> {
  const recipientEmail = (Array.isArray(msg.to) ? msg.to[0] : msg.to).toLowerCase();
  const recipientDomain = recipientEmail.split('@')[1] || '';
  const MICROSOFT_DOMAINS = ['hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de', 'hotmail.it', 'hotmail.es', 'outlook.com', 'outlook.co.uk', 'outlook.fr', 'outlook.de', 'live.com', 'live.co.uk', 'msn.com', 'windowslive.com'];
  const isMicrosoftRecipient = MICROSOFT_DOMAINS.includes(recipientDomain);
  
  const primaryProvider = currentEmailProvider;
  const backupProvider: 'gmail' | 'sendgrid' = primaryProvider === 'sendgrid' ? 'gmail' : 'sendgrid';
  
  if (isMicrosoftRecipient) {
    console.log(`[Email] Microsoft recipient detected (${recipientDomain}) - using default provider (${primaryProvider})`);
  }
  
  // Try primary provider
  console.log(`[Email] Sending via ${primaryProvider} (primary)...`);
  const primaryResult = primaryProvider === 'sendgrid' 
    ? await sendViaSendGrid(msg) 
    : await sendViaGmail(msg);
  
  if (primaryResult.success) {
    // Log successful email
    if (logContext) {
      logEmailToDb({
        recipientEmail: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
        recipientName: logContext.recipientName,
        recipientType: logContext.recipientType,
        subject: msg.subject,
        emailType: logContext.emailType,
        provider: primaryProvider,
        status: 'sent',
        messageId: primaryResult.messageId,
        metadata: logContext.metadata,
      });
    }
    return { success: true, messageId: primaryResult.messageId };
  }
  
  console.error(`[Email] ${primaryProvider} failed: ${primaryResult.error}`);
  console.log(`[Email] Retrying via ${backupProvider} (backup)...`);
  
  // Try backup provider
  const backupResult = backupProvider === 'sendgrid'
    ? await sendViaSendGrid(msg)
    : await sendViaGmail(msg);
  
  if (backupResult.success) {
    console.log(`[Email] Successfully sent via backup provider (${backupProvider})`);
    // Log successful email via backup
    if (logContext) {
      logEmailToDb({
        recipientEmail: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
        recipientName: logContext.recipientName,
        recipientType: logContext.recipientType,
        subject: msg.subject,
        emailType: logContext.emailType,
        provider: backupProvider,
        status: 'sent',
        messageId: backupResult.messageId,
        metadata: logContext.metadata,
      });
    }
    // Notify admins about the primary failure (but email was delivered)
    sendEmailFailureNotification(msg, primaryProvider, primaryResult.error || 'Unknown error', backupProvider);
    return { success: true, messageId: backupResult.messageId };
  }
  
  console.error(`[Email] Both providers failed! Primary: ${primaryResult.error}, Backup: ${backupResult.error}`);
  // Log failed email
  if (logContext) {
    logEmailToDb({
      recipientEmail: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
      recipientName: logContext.recipientName,
      recipientType: logContext.recipientType,
      subject: msg.subject,
      emailType: logContext.emailType,
      provider: primaryProvider,
      status: 'failed',
      error: `Primary (${primaryProvider}): ${primaryResult.error}; Backup (${backupProvider}): ${backupResult.error}`,
      metadata: logContext.metadata,
    });
  }
  // Notify admins about complete failure
  sendEmailFailureNotification(msg, primaryProvider, primaryResult.error || 'Unknown error', backupProvider, backupResult.error);
  
  return { success: false };
}

// Retry sending an email directly via Gmail (used when SendGrid bounces)
export async function retrySendViaGmail(msg: EmailMessage, logContext?: EmailLogContext): Promise<{ success: boolean; messageId?: string }> {
  console.log(`[Email] Retrying via Gmail after SendGrid bounce for: ${Array.isArray(msg.to) ? msg.to.join(', ') : msg.to}`);
  const result = await sendViaGmail(msg);
  
  if (result.success && logContext) {
    logEmailToDb({
      recipientEmail: Array.isArray(msg.to) ? msg.to.join(", ") : msg.to,
      recipientName: logContext.recipientName,
      recipientType: logContext.recipientType,
      subject: msg.subject,
      emailType: logContext.emailType,
      provider: 'gmail',
      status: 'sent',
      messageId: result.messageId,
      metadata: { ...logContext.metadata, retryReason: 'sendgrid_bounce' },
    });
  }
  
  if (result.success) {
    console.log(`[Email] Gmail retry successful for: ${Array.isArray(msg.to) ? msg.to.join(', ') : msg.to} (ID: ${result.messageId})`);
  } else {
    console.error(`[Email] Gmail retry also failed for: ${Array.isArray(msg.to) ? msg.to.join(', ') : msg.to} - ${result.error}`);
  }
  
  return result;
}

// Generic partner email function for simple notifications with optional logging
export async function sendPartnerEmail(options: { 
  to: string; 
  subject: string; 
  html: string; 
  text?: string;
  logContext?: EmailLogContext;
}): Promise<{ success: boolean; messageId?: string }> {
  return sendEmail({
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    from: { email: fromEmail || '', name: 'HumanMetrix' },
  }, options.logContext);
}


export async function sendInvitationEmail(invitation: Invitation, inviterName: string, options?: { forceGmail?: boolean }) {
  // Format assessment names nicely
  const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = formattedAssessments.join(', ');
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`;
  
  const msg = {
    to: invitation.candidateEmail,
    subject: `Assessment Invitation from ${inviterName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .assessments { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
            ul { padding-left: 20px; }
            li { margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${invitation.candidateName},</h2>
              <p>${inviterName} has invited you to complete the following assessments:</p>
              
              <div class="assessments">
                <strong>Assessments:</strong>
                <ul style="margin: 10px 0 0 0;">
                  ${assessmentListHtml}
                </ul>
              </div>
              
              ${invitation.message ? `<p style="background: #f3f4f6; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0;"><em>"${invitation.message}"</em></p>` : ''}
              
              <p>These assessments are designed to evaluate your AI readiness and capabilities. Click the button below to get started:</p>
              
              <div style="text-align: center;">
                <a href="${inviteUrl}" class="button" style="color: white !important;">Start Assessments</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric' 
                })}.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
              <p style="margin-top: 10px;">
                <a href="${inviteUrl}" style="color: #667eea; text-decoration: none;">View Invitation</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${invitation.candidateName},

${inviterName} has invited you to complete the following assessments on HumanMetrix:

Assessments: ${assessmentListText}

${invitation.message ? `Message: "${invitation.message}"\n\n` : ''}

Click the link below to get started:
${inviteUrl}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB')}.

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const logContext: EmailLogContext = {
    recipientType: 'b2b_test_taker',
    emailType: 'invitation',
    recipientName: invitation.candidateName,
    metadata: { invitationId: invitation.id, assessmentTypes: invitation.assessmentTypes },
  };

  const result = options?.forceGmail
    ? await retrySendViaGmail(msg, logContext)
    : await sendEmail(msg, logContext);
  if (result.success) {
    console.log(`[Email] Invitation email sent to ${invitation.candidateEmail} via ${options?.forceGmail ? 'Gmail (forced)' : 'default'} (ID: ${result.messageId})`);
  }
  return result;
}

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  
  const msg = {
    to: email,
    subject: 'Reset Your Password - HumanMetrix',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello ${name},</p>
              <p>We received a request to reset your password. Click the button below to choose a new password:</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button" style="color: white !important;">Reset Password</a>
              </div>
              
              <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #06b6d4;">${resetUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Password Reset Request

Hello ${name},

We received a request to reset your password for your HumanMetrix account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg, {
    recipientType: 'b2c_customer',
    emailType: 'password_reset',
    recipientName: name,
  });
  if (result.success) {
    console.log(`[Email] Password reset email sent to ${email} (ID: ${result.messageId})`);
  }
}

export async function sendWelcomeEmailWithPassword(
  email: string, 
  name: string, 
  temporaryPassword: string, 
  note?: string,
  context: 'invitation' | 'post_payment' = 'invitation'
) {
  const baseUrl = getBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  
  // Use different subject line based on context
  const subject = context === 'post_payment' 
    ? 'Your Account Credentials - HumanMetrix'
    : 'Your Assessment Invitation - HumanMetrix';
  
  const msg = {
    to: email,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .credentials { background: #f0f9ff; border: 2px solid #06b6d4; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .password-box { background: #0a1628; color: #06b6d4; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 10px 0; letter-spacing: 2px; }
            .note-box { background: #f3f4f6; padding: 15px; border-left: 4px solid #06b6d4; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Welcome to HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2>Hello ${name},</h2>
              <p>An account has been created for you on HumanMetrix. Use the following credentials to log in and complete your assessments:</p>
              
              ${note ? `<div class="note-box"><em>"${note}"</em></div>` : ''}
              
              <div class="credentials">
                <p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0 0 10px 0;"><strong>Password:</strong></p>
                <div class="password-box">${temporaryPassword}</div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button" style="color: white !important;">Log In Now</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you need help, please don't hesitate to reach out to your assessment coordinator at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to HumanMetrix

Hello ${name},

An account has been created for you on HumanMetrix.

${note ? `Note: "${note}"\n\n` : ''}
Login Credentials:
Email: ${email}
Password: ${temporaryPassword}

Log in at: ${loginUrl}

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const logContext: EmailLogContext = {
    recipientName: name,
    recipientType: context === 'post_payment' ? 'b2b_test_taker' : 'b2c_customer',
    emailType: 'welcome',
    metadata: { context },
  };

  const result = await sendEmail(msg, logContext);
  if (result.success) {
    console.log(`[Email] Welcome email sent to ${email} (ID: ${result.messageId})`);
  } else {
    throw new Error(`Failed to send welcome email to ${email}`);
  }
}

export async function sendContactFormEmail(
  name: string,
  email: string,
  company: string,
  message: string,
  intent: 'demo' | 'sales'
) {
  const intentLabel = intent === 'demo' ? 'Demo Request' : 'Sales Inquiry';
  const salesEmail = 'hello@humanmetrix.co.uk';

  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Contact Form' },
    to: salesEmail,
    replyTo: email,
    subject: `${intentLabel} from ${name} - ${company}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .field { margin-bottom: 20px; }
            .label { font-weight: 600; color: #374151; margin-bottom: 5px; }
            .value { color: #1f2937; }
            .message-box { background: #f9fafb; border-left: 4px solid #06b6d4; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .badge { display: inline-block; background: #06b6d4; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">New ${intentLabel}</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">HumanMetrix Contact Form</p>
            </div>
            <div class="content">
              <div class="badge">${intentLabel.toUpperCase()}</div>
              
              <div class="field">
                <div class="label">Name:</div>
                <div class="value">${name}</div>
              </div>
              
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${email}" style="color: #06b6d4; text-decoration: none;">${email}</a></div>
              </div>
              
              <div class="field">
                <div class="label">Company:</div>
                <div class="value">${company}</div>
              </div>
              
              <div class="field">
                <div class="label">Message:</div>
                <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Submitted on ${new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
              <p style="margin-top: 10px;">
                Reply directly to this email to respond to ${name}
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New ${intentLabel} - HumanMetrix

${intentLabel}: ${intentLabel.toUpperCase()}

Name: ${name}
Email: ${email}
Company: ${company}

Message:
${message}

Submitted on ${new Date().toLocaleDateString('en-GB', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Reply directly to this email to respond to ${name}

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Contact form email sent to ${salesEmail} from ${email} (ID: ${result.messageId})`);
  }
}

// Send billing change request notification to admin team
export async function sendBillingChangeRequestEmail(options: {
  partnerCompanyName: string;
  requesterName: string;
  requesterEmail: string;
  currentBillingType: string;
  requestedBillingType: string;
  reason?: string;
}) {
  const adminEmail = 'hello@humanmetrix.co.uk';
  const { partnerCompanyName, requesterName, requesterEmail, currentBillingType, requestedBillingType, reason } = options;

  const formatBillingType = (type: string) => {
    switch (type) {
      case 'payg': return 'Pay-As-You-Go';
      case 'subscription': return 'Subscription';
      case 'enterprise': return 'Enterprise';
      default: return type;
    }
  };

  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Billing' },
    to: adminEmail,
    replyTo: requesterEmail,
    subject: `Billing Change Request: ${partnerCompanyName} - ${formatBillingType(currentBillingType)} → ${formatBillingType(requestedBillingType)}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .field { margin-bottom: 20px; }
            .label { font-weight: 600; color: #374151; margin-bottom: 5px; }
            .value { color: #1f2937; }
            .change-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
            .reason-box { background: #f9fafb; border-left: 4px solid #06b6d4; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .badge { display: inline-block; background: #f59e0b; color: white; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Billing Change Request</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Partner Account Update</p>
            </div>
            <div class="content">
              <div class="badge">ACTION REQUIRED</div>
              
              <div class="field">
                <div class="label">Partner Company:</div>
                <div class="value">${partnerCompanyName}</div>
              </div>
              
              <div class="field">
                <div class="label">Requested By:</div>
                <div class="value">${requesterName} (<a href="mailto:${requesterEmail}" style="color: #06b6d4; text-decoration: none;">${requesterEmail}</a>)</div>
              </div>
              
              <div class="change-box">
                <div class="label">Billing Type Change:</div>
                <div class="value" style="font-size: 16px; font-weight: 600;">
                  ${formatBillingType(currentBillingType)} → ${formatBillingType(requestedBillingType)}
                </div>
              </div>
              
              ${reason ? `
              <div class="field">
                <div class="label">Reason:</div>
                <div class="reason-box">${reason.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Submitted on ${new Date().toLocaleDateString('en-GB', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
              
              <p style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 4px;">
                Please review this request in the Super Admin dashboard under <strong>Billing Change Requests</strong>.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Billing Change Request - HumanMetrix

ACTION REQUIRED

Partner Company: ${partnerCompanyName}
Requested By: ${requesterName} (${requesterEmail})

Billing Type Change:
${formatBillingType(currentBillingType)} → ${formatBillingType(requestedBillingType)}

${reason ? `Reason:\n${reason}\n` : ''}

Submitted on ${new Date().toLocaleDateString('en-GB', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})}

Please review this request in the Super Admin dashboard under Billing Change Requests.

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Billing change request notification sent to ${adminEmail} for ${partnerCompanyName} (ID: ${result.messageId})`);
  }
}

// Format amount with currency symbol
function formatCurrencyAmount(amountInCents: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    'gbp': '£',
    'usd': '$',
    'eur': '€',
    'aud': 'A$',
    'cad': 'C$',
    'nzd': 'NZ$',
    'sgd': 'S$',
    'hkd': 'HK$',
    'jpy': '¥',
    'cny': '¥',
    'inr': '₹',
    'php': '₱',
    'vnd': '₫',
    'idr': 'Rp',
    'myr': 'RM',
    'thb': '฿',
    'krw': '₩',
    'zar': 'R',
    'brl': 'R$',
    'mxn': 'MX$',
    'chf': 'CHF ',
    'sek': 'kr',
    'nok': 'kr',
    'dkk': 'kr',
    'pln': 'zł',
  };
  
  const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase() + ' ';
  const amount = (amountInCents / 100).toFixed(2);
  return `${symbol}${amount}`;
}

export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  assessments: string[],
  totalAmount: number,
  sessionId: string,
  currency: string = 'gbp'
) {
  // Format assessment names for display
  const formattedAssessments = assessments.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = formattedAssessments.join(', ');
  const amountFormatted = formatCurrencyAmount(totalAmount, currency);

  const msg = {
    to: email,
    subject: 'Payment Receipt - HumanMetrix',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .receipt { background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .total { background: #0a1628; color: #06b6d4; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Payment Successful</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">HumanMetrix Receipt</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <div class="success-badge">✓ Payment Confirmed</div>
              </div>
              
              <h2>Hello ${name},</h2>
              <p>Thank you for your purchase! Your payment has been successfully processed.</p>
              
              <div class="receipt">
                <h3 style="margin-top: 0; color: #374151;">Purchase Details</h3>
                <p><strong>Results Unlocked:</strong></p>
                <ul style="margin-left: 20px; padding-left: 0; list-style-position: inside;">
                  ${assessmentListHtml}
                </ul>
                
                <div class="total">
                  Total Paid: ${amountFormatted}
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
                  Reference: ${sessionId.slice(-12).toUpperCase()}<br>
                  Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <h3>Next Steps:</h3>
              <ol style="padding-left: 20px;">
                <li>Log in to your HumanMetrix account</li>
                <li>View your comprehensive results on your dashboard</li>
              </ol>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact us at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
              <p style="margin-top: 10px; color: #9ca3af;">
                This is an automated receipt for your records.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Payment Successful - HumanMetrix Receipt

Hello ${name},

Thank you for your purchase! Your payment has been successfully processed.

PURCHASE DETAILS:
Results Unlocked: ${assessmentListText}
Total Paid: ${amountFormatted}
Reference: ${sessionId.slice(-12).toUpperCase()}
Date: ${new Date().toLocaleDateString('en-GB')}

NEXT STEPS:
1. Log in to your HumanMetrix account
2. View your comprehensive results on your dashboard

If you have any questions, please contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
This is an automated receipt for your records.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Payment receipt email sent to ${email} (ID: ${result.messageId})`);
  }
}

// Interface for PDF receipt email details
export interface PdfReceiptEmailDetails {
  email: string;
  name: string;
  companyName?: string;
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
  transactionId: string;
  paymentMethod?: string;
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    postcode?: string;
    country?: string;
  };
}

// Send payment receipt email with PDF attachment
export async function sendPaymentReceiptWithPdf(details: PdfReceiptEmailDetails): Promise<{ success: boolean; receiptNumber?: string }> {
  // Generate receipt number
  const receiptNumber = generateInvoiceReceiptNumber('RCP', details.transactionId.slice(-8), new Date());
  
  // Generate PDF receipt
  const receiptData: ReceiptData = {
    documentType: 'receipt',
    receiptNumber,
    date: new Date(),
    partnerName: details.name,
    companyName: details.companyName || details.name,
    billingType: 'payg',
    billingAddress: details.billingAddress,
    items: details.items,
    subtotal: details.subtotal,
    tax: details.tax,
    taxRate: details.taxRate,
    total: details.total,
    currency: details.currency,
    paymentMethod: details.paymentMethod || 'Card',
    paymentDate: new Date(),
    transactionId: details.transactionId,
  };
  
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = generateReceiptPDF(receiptData);
  } catch (pdfError: any) {
    console.error(`❌ Failed to generate PDF receipt:`, pdfError.message);
    // Fall back to sending email without attachment
    return { success: false };
  }
  
  // Format amount for display
  const currencySymbols: Record<string, string> = {
    gbp: '£', usd: '$', eur: '€', aud: 'A$', cad: 'C$', sgd: 'S$',
    hkd: 'HK$', nzd: 'NZ$', jpy: '¥', cny: '¥', inr: '₹'
  };
  const currency = (details.currency || 'gbp').toLowerCase();
  const symbol = currencySymbols[currency] || currency.toUpperCase() + ' ';
  const amountFormatted = `${symbol}${(details.total / 100).toFixed(2)}`;
  
  // Format items for email
  const itemsHtml = details.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${symbol}${(item.amount / 100).toFixed(2)}</td>
    </tr>
  `).join('');
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix' },
    to: details.email,
    subject: `Payment Receipt - HumanMetrix`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .receipt-box { background: #f9fafb; border: 2px solid #e5e7eb; padding: 20px; border-radius: 6px; margin: 20px 0; }
            .total { background: #0a1628; color: #06b6d4; padding: 15px; border-radius: 6px; font-size: 24px; font-weight: bold; text-align: center; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
            .pdf-note { background: #eff6ff; border: 1px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0; color: #1e40af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Payment Confirmed</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Receipt ${receiptNumber}</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <div class="success-badge">✓ Payment Successful</div>
              </div>
              
              <h2>Hello ${details.name},</h2>
              <p>Thank you for your payment! Your transaction has been successfully processed.</p>
              
              <div class="receipt-box">
                <h3 style="margin-top: 0; color: #374151;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  ${itemsHtml}
                </table>
                
                <div class="total">
                  Total Paid: ${amountFormatted}
                </div>
                
                <p style="color: #6b7280; font-size: 14px; margin-top: 15px;">
                  Reference: ${receiptNumber}<br>
                  Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
              
              <div class="pdf-note">
                <strong>📎 PDF Receipt Attached</strong><br>
                A professional PDF receipt is attached to this email for your records.
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact us at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Payment Confirmed - Receipt ${receiptNumber}

Hello ${details.name},

Thank you for your payment! Your transaction has been successfully processed.

Total Paid: ${amountFormatted}
Reference: ${receiptNumber}
Date: ${new Date().toLocaleDateString('en-GB')}

A PDF receipt is attached to this email for your records.

If you have any questions, please contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
    attachments: [
      {
        filename: `HumanMetrix_Receipt_${receiptNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Payment receipt with PDF sent to ${details.email} (Receipt: ${receiptNumber}, ID: ${result.messageId})`);
    return { success: true, receiptNumber };
  } else {
    console.error(`[Email] Failed to send payment receipt with PDF to ${details.email}`);
    return { success: false };
  }
}

// Send quota warning email to partner at 70% usage
export async function sendPartnerQuotaWarning70(
  partnerEmail: string,
  companyName: string,
  testsUsed: number,
  testsTotal: number,
  testsRemaining: number
) {
  const usagePercentage = Math.round((testsUsed / testsTotal) * 100);
  const baseUrl = getBaseUrl();
  const topUpUrl = `${baseUrl}/partner-dashboard?tab=billing`;
  
  const msg = {
    to: partnerEmail,
    subject: `Credit Quota Alert: 70% Used - ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .stats { background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .stat-number { font-size: 24px; font-weight: bold; color: #d97706; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Quota Alert</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">HumanMetrix Partner Notification</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              <p>This is a friendly reminder that you've used <strong>${usagePercentage}%</strong> of your HumanMetrix credit quota.</p>
              
              <div class="stats">
                <p style="margin: 0;"><strong>Current Usage:</strong></p>
                <p style="margin: 10px 0;">
                  <span class="stat-number">${testsUsed}</span> / ${testsTotal} tests used
                </p>
                <p style="margin: 0;">
                  <strong>${testsRemaining} credits remaining</strong>
                </p>
              </div>
              
              <p>To ensure uninterrupted service for your platform, we recommend purchasing additional test credits before your quota runs out.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button" style="color: white !important;">Top Up Your Tests</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>What happens when you run out?</strong><br>
                When your quota reaches 100%, your API access will be temporarily suspended until you purchase more credits.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
              <p>Questions? Contact us at hello@humanmetrix.co.uk</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Quota Alert - HumanMetrix

Hello ${companyName},

This is a friendly reminder that you've used ${usagePercentage}% of your HumanMetrix credit quota.

CURRENT USAGE:
${testsUsed} / ${testsTotal} tests used
${testsRemaining} credits remaining

To ensure uninterrupted service, we recommend purchasing additional test credits before your quota runs out.

Visit ${topUpUrl} to top up your credits.

What happens when you run out?
When your quota reaches 100%, your API access will be temporarily suspended until you purchase more credits.

Questions? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] 70% quota warning email sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Send urgent quota warning email to partner at 90% usage
export async function sendPartnerQuotaWarning90(
  partnerEmail: string,
  companyName: string,
  testsUsed: number,
  testsTotal: number,
  testsRemaining: number
) {
  const usagePercentage = Math.round((testsUsed / testsTotal) * 100);
  const baseUrl = getBaseUrl();
  const topUpUrl = `${baseUrl}/partner-dashboard?tab=billing`;
  
  const msg = {
    to: partnerEmail,
    subject: `URGENT: Credit Quota Critical - Only ${testsRemaining} Credits Left!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .stats { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
            .stat-number { font-size: 28px; font-weight: bold; color: #dc2626; }
            .urgent { background: #fef2f2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">URGENT: Quota Critical</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <div class="urgent">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                  Your credit quota is almost exhausted!
                </p>
              </div>
              
              <div class="stats">
                <p style="margin: 0;"><strong>Critical Usage Level:</strong></p>
                <p style="margin: 10px 0;">
                  <span class="stat-number">${usagePercentage}%</span> used
                </p>
                <p style="margin: 0; font-size: 18px;">
                  Only <strong>${testsRemaining} tests</strong> remaining!
                </p>
              </div>
              
              <p><strong>Please top up immediately to avoid service interruption.</strong></p>
              <p>When your quota reaches 100%, your API access will be <strong>automatically suspended</strong> and your embedded assessments will stop working until you purchase more credits.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button" style="color: white !important;">Top Up Now</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need help? Our team is available at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
URGENT: Quota Critical - HumanMetrix

Hello ${companyName},

YOUR CREDIT QUOTA IS ALMOST EXHAUSTED!

CRITICAL USAGE LEVEL:
${usagePercentage}% used
Only ${testsRemaining} credits remaining!

PLEASE TOP UP IMMEDIATELY TO AVOID SERVICE INTERRUPTION.

When your quota reaches 100%, your API access will be automatically suspended and your embedded assessments will stop working until you purchase more credits.

Visit ${topUpUrl} to top up now.

Need help? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] 90% URGENT quota warning email sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Send notification when API access is suspended
export async function sendPartnerAccessSuspendedEmail(
  partnerEmail: string,
  companyName: string
) {
  const baseUrl = getBaseUrl();
  const topUpUrl = `${baseUrl}/partner-dashboard?tab=billing`;
  
  const msg = {
    to: partnerEmail,
    subject: `API Access Suspended - Quota Exhausted`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .suspended { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1f2937; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #ffffff;">Access Suspended</h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff;">Your Credit Quota Has Been Exhausted</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <div class="suspended">
                <p style="margin: 0; font-size: 18px; font-weight: bold;">
                  Your API access has been temporarily suspended.
                </p>
                <p style="margin: 10px 0 0 0; color: #6b7280;">
                  All embedded assessments are currently inactive.
                </p>
              </div>
              
              <p>Your credit quota has been fully consumed. To restore access and reactivate your embedded assessments, please purchase a new credit package.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button" style="color: white !important;">Restore Access - Purchase Tests</a>
              </div>
              
              <p>Once you purchase additional tests, your API access will be <strong>automatically restored</strong> and your embedded assessments will resume working immediately.</p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need immediate assistance? Contact us at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
API Access Suspended - HumanMetrix

Hello ${companyName},

Your API access has been temporarily suspended.
All embedded assessments are currently inactive.

Your credit quota has been fully consumed. To restore access and reactivate your embedded assessments, please purchase a new credit package.

Visit ${topUpUrl} to restore access.

Once you purchase additional tests, your API access will be automatically restored and your embedded assessments will resume working immediately.

Need immediate assistance? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Access suspended email sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Send partner security alert email
export async function sendPartnerSecurityAlert(
  partnerEmail: string,
  companyName: string,
  alertType: string,
  alertMessage: string
) {
  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/developers?tab=security`;
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Security' },
    to: partnerEmail,
    subject: `[Security Alert] ${alertType} - ${companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .alert-box { background: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Security Alert</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${alertType}</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <div class="alert-box">
                <p style="margin: 0; color: #991b1b;">${alertMessage}</p>
              </div>
              
              <p>If you did not initiate this action or believe this is unauthorized activity, please take immediate action:</p>
              
              <ol>
                <li>Review your API key and regenerate if necessary</li>
                <li>Check your integration configurations</li>
                <li>Review recent API activity in your dashboard</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button" style="color: white !important;">Review Security Settings</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any concerns, contact us immediately at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>This is an automated security notification from HumanMetrix.</p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Security Alert - ${alertType}

Hello ${companyName},

${alertMessage}

If you did not initiate this action or believe this is unauthorized activity, please take immediate action:

1. Review your API key and regenerate if necessary
2. Check your integration configurations
3. Review recent API activity in your dashboard

Visit ${dashboardUrl} to review your security settings.

If you have any concerns, contact us immediately at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Security alert email sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Send monthly usage summary email
export async function sendPartnerMonthlySummary(
  partnerEmail: string,
  companyName: string,
  monthName: string,
  testsUsed: number,
  testsRemaining: number
) {
  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/developers?tab=analytics`;
  
  const msg = {
    to: partnerEmail,
    subject: `Monthly Usage Summary - ${monthName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .stats { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .stat-item { text-align: center; padding: 15px; }
            .stat-number { font-size: 32px; font-weight: bold; color: #0369a1; }
            .stat-label { color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Monthly Summary</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${monthName}</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <p>Here's a summary of your HumanMetrix usage for ${monthName}:</p>
              
              <div class="stats">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td class="stat-item" width="50%">
                      <div class="stat-number">${testsUsed}</div>
                      <div class="stat-label">Assessments Completed</div>
                    </td>
                    <td class="stat-item" width="50%">
                      <div class="stat-number">${testsRemaining}</div>
                      <div class="stat-label">Credits Remaining</div>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p>View detailed analytics and insights in your dashboard:</p>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button" style="color: white !important;">View Full Report</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Questions? Contact us at hello@humanmetrix.co.uk
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Monthly Summary - ${monthName}

Hello ${companyName},

Here's a summary of your HumanMetrix usage for ${monthName}:

Assessments Completed: ${testsUsed}
Credits Remaining: ${testsRemaining}

View detailed analytics and insights at ${dashboardUrl}

Questions? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Monthly summary email sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Send auto top-up confirmation email
export async function sendPartnerAutoTopUpConfirmation(
  partnerEmail: string,
  companyName: string,
  testsAdded: number,
  amountCharged: number,
  packageName: string
) {
  const baseUrl = getBaseUrl();
  const dashboardUrl = `${baseUrl}/partner-dashboard`;
  
  const msg = {
    to: partnerEmail,
    subject: `Auto Top-Up Complete: ${testsAdded} Tests Added`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #06b6d4; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .receipt { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .receipt-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .receipt-row:last-child { border-bottom: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Auto Top-Up Complete</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your quota has been replenished</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <p>Your auto top-up has been successfully processed. Your credit quota has been replenished automatically.</p>
              
              <div class="receipt">
                <h3 style="margin-top: 0;">Purchase Receipt</h3>
                <div class="receipt-row">
                  <span>Package:</span>
                  <span>${packageName}</span>
                </div>
                <div class="receipt-row">
                  <span>Tests Added:</span>
                  <span>${testsAdded} credits</span>
                </div>
                <div class="receipt-row">
                  <span>Amount Charged:</span>
                  <span>£${amountCharged.toFixed(2)}</span>
                </div>
              </div>
              
              <p>Your embedded assessments will continue to work seamlessly. No action is required on your part.</p>
              
              <div style="text-align: center;">
                <a href="${dashboardUrl}" class="button" style="color: white !important;">View Your Dashboard</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                To manage your auto top-up settings or view your billing history, visit your Partner Dashboard.
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Auto Top-Up Complete - HumanMetrix

Hello ${companyName},

Your auto top-up has been successfully processed.

Purchase Receipt:
- Package: ${packageName}
- Tests Added: ${testsAdded} credits
- Amount Charged: £${amountCharged.toFixed(2)}

Your embedded assessments will continue to work seamlessly. No action is required on your part.

Visit ${dashboardUrl} to view your dashboard.

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Auto top-up confirmation sent to ${partnerEmail} (ID: ${result.messageId})`);
  }
}

// Interface for invoice details
interface InvoiceDetails {
  invoiceNumber: string;
  companyName: string;
  partnerEmail: string;
  periodStart: Date;
  periodEnd: Date;
  testsUsed: number;
  pricePerTest: number; // In smallest currency unit (pence/cents)
  subtotal: number; // In smallest currency unit
  vatRate: number; // Percentage (e.g., 20)
  vatAmount: number; // In smallest currency unit
  totalAmount: number; // In smallest currency unit
  currency?: string; // Currency code (e.g., 'gbp', 'usd', 'eur') - defaults to 'gbp'
  dueDate: Date;
  paymentTermsDays: number;
  invoiceNotes?: string;
}

// Currency symbols map
const CURRENCY_SYMBOLS: Record<string, string> = {
  gbp: '£', usd: '$', eur: '€', aud: 'A$', cad: 'C$', sgd: 'S$', 
  hkd: 'HK$', nzd: 'NZ$', jpy: '¥', cny: '¥', inr: '₹', php: '₱',
  myr: 'RM', thb: '฿', idr: 'Rp', vnd: '₫', krw: '₩'
};

// Send invoice email to enterprise partner with PDF attachment
export async function sendPartnerInvoiceEmail(details: InvoiceDetails & { billingAddress?: { line1?: string; line2?: string; city?: string; postcode?: string; country?: string } }) {
  // Get currency symbol based on partner's currency
  const currency = (details.currency || 'gbp').toLowerCase();
  const currencySymbol = CURRENCY_SYMBOLS[currency] || currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  // Generate PDF invoice
  let pdfBuffer: Buffer | undefined;
  try {
    const { generateInvoicePDF } = await import('./generateReceipt');
    const invoiceData = {
      documentType: 'invoice' as const,
      receiptNumber: details.invoiceNumber, // Use invoice number as receipt number for consistency
      invoiceNumber: details.invoiceNumber,
      date: new Date(),
      dueDate: details.dueDate,
      partnerName: details.companyName,
      companyName: details.companyName,
      billingType: 'enterprise' as const,
      billingAddress: details.billingAddress,
      items: [{
        description: `HumanMetrix Assessment Services (${formatDate(details.periodStart)} - ${formatDate(details.periodEnd)})`,
        quantity: details.testsUsed,
        unitPrice: details.pricePerTest,
        amount: details.subtotal
      }],
      subtotal: details.subtotal,
      tax: details.vatAmount,
      taxRate: details.vatRate,
      total: details.totalAmount,
      currency: currency.toUpperCase(), // Ensure uppercase for proper symbol lookup
      periodStart: details.periodStart,
      periodEnd: details.periodEnd,
    };
    pdfBuffer = generateInvoicePDF(invoiceData);
    console.log(`✓ Generated PDF invoice for ${details.invoiceNumber}`);
  } catch (pdfError: any) {
    console.error(`⚠ Failed to generate PDF invoice:`, pdfError.message);
    // Continue without attachment
  }
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Finance' },
    to: details.partnerEmail,
    subject: `Invoice ${details.invoiceNumber} - HumanMetrix Assessment Services`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .header-content { display: flex; justify-content: space-between; align-items: flex-start; }
            .logo { font-size: 28px; font-weight: bold; margin: 0; }
            .invoice-title { text-align: right; }
            .invoice-number { font-size: 14px; opacity: 0.9; margin-top: 5px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .invoice-meta { display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
            .meta-section { }
            .meta-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 5px; }
            .meta-value { font-weight: 600; }
            .line-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .line-items th { background: #f9fafb; padding: 12px; text-align: left; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            .line-items td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
            .line-items .amount { text-align: right; }
            .totals { margin-left: auto; width: 300px; margin-top: 20px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.subtotal { border-top: 1px solid #e5e7eb; padding-top: 15px; }
            .totals-row.total { font-size: 20px; font-weight: bold; color: #0a1628; border-top: 2px solid #0a1628; padding-top: 15px; margin-top: 10px; }
            .payment-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #06b6d4; }
            .due-date { background: #fef3c7; padding: 15px 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; margin-top: 30px; }
            .notes { background: #f9fafb; padding: 15px; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div>
                  <h1 class="logo">HumanMetrix</h1>
                  <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 14px;">AI Assessment Platform</p>
                </div>
                <div class="invoice-title">
                  <p style="font-size: 24px; margin: 0; font-weight: 600;">INVOICE</p>
                  <p class="invoice-number">${details.invoiceNumber}</p>
                </div>
              </div>
            </div>
            
            <div class="content">
              <div class="invoice-meta">
                <div class="meta-section">
                  <p class="meta-label">Bill To</p>
                  <p class="meta-value" style="font-size: 18px;">${details.companyName}</p>
                  <p style="color: #6b7280; margin: 5px 0 0 0;">${details.partnerEmail}</p>
                </div>
                <div class="meta-section" style="text-align: right;">
                  <p class="meta-label">Invoice Date</p>
                  <p class="meta-value">${formatDate(new Date())}</p>
                  <p class="meta-label" style="margin-top: 15px;">Service Period</p>
                  <p class="meta-value">${formatDate(details.periodStart)} - ${formatDate(details.periodEnd)}</p>
                </div>
              </div>
              
              <table class="line-items">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style="text-align: center;">Quantity</th>
                    <th style="text-align: right;">Unit Price</th>
                    <th style="text-align: right;">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>HumanMetrix Assessment Services</strong><br>
                      <span style="color: #6b7280; font-size: 14px;">AI-powered assessments for ${formatDate(details.periodStart)} - ${formatDate(details.periodEnd)}</span>
                    </td>
                    <td style="text-align: center;">${details.testsUsed}</td>
                    <td class="amount">${formatCurrency(details.pricePerTest)}</td>
                    <td class="amount"><strong>${formatCurrency(details.subtotal)}</strong></td>
                  </tr>
                </tbody>
              </table>
              
              <div class="totals">
                <div class="totals-row subtotal">
                  <span>Subtotal</span>
                  <span>${formatCurrency(details.subtotal)}</span>
                </div>
                <div class="totals-row">
                  <span>VAT (${details.vatRate}%)</span>
                  <span>${formatCurrency(details.vatAmount)}</span>
                </div>
                <div class="totals-row total">
                  <span>Total Due</span>
                  <span>${formatCurrency(details.totalAmount)}</span>
                </div>
              </div>
              
              <div class="due-date">
                <strong>⏰ Payment Due: ${formatDate(details.dueDate)}</strong>
                <p style="margin: 5px 0 0 0; color: #92400e;">Payment terms: Net ${details.paymentTermsDays} days</p>
              </div>
              
              <div class="payment-info">
                <h3 style="margin: 0 0 15px 0; color: #0369a1;">Payment Details</h3>
                <p style="margin: 0;">
                  <strong>Bank:</strong> [Bank Name]<br>
                  <strong>Account Name:</strong> HumanMetrix Ltd<br>
                  <strong>Sort Code:</strong> XX-XX-XX<br>
                  <strong>Account Number:</strong> XXXXXXXX<br>
                  <strong>Reference:</strong> ${details.invoiceNumber}
                </p>
              </div>
              
              ${details.invoiceNotes ? `
              <div class="notes">
                <h4 style="margin: 0 0 10px 0; color: #374151;">Notes</h4>
                <p style="margin: 0; color: #6b7280;">${details.invoiceNotes}</p>
              </div>
              ` : ''}
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.</p>
              <p style="margin-top: 10px;">
                Questions about this invoice? Contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #06b6d4;">hello@humanmetrix.co.uk</a>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                HumanMetrix Ltd | Company Registration: [Number] | VAT Registration: [Number]
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
INVOICE - HumanMetrix

Invoice Number: ${details.invoiceNumber}
Invoice Date: ${formatDate(new Date())}

BILL TO:
${details.companyName}
${details.partnerEmail}

SERVICE PERIOD:
${formatDate(details.periodStart)} - ${formatDate(details.periodEnd)}

LINE ITEMS:
-------------------------------------------
HumanMetrix Assessment Services
Quantity: ${details.testsUsed} tests
Unit Price: ${formatCurrency(details.pricePerTest)}
Amount: ${formatCurrency(details.subtotal)}
-------------------------------------------

TOTALS:
Subtotal: ${formatCurrency(details.subtotal)}
VAT (${details.vatRate}%): ${formatCurrency(details.vatAmount)}
-------------------------------------------
TOTAL DUE: ${formatCurrency(details.totalAmount)}
-------------------------------------------

PAYMENT DUE: ${formatDate(details.dueDate)}
Payment terms: Net ${details.paymentTermsDays} days

PAYMENT DETAILS:
Bank: [Bank Name]
Account Name: HumanMetrix Ltd
Sort Code: XX-XX-XX
Account Number: XXXXXXXX
Reference: ${details.invoiceNumber}

${details.invoiceNotes ? `NOTES:\n${details.invoiceNotes}\n` : ''}
Questions about this invoice? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.
    `.trim(),
    attachments: pdfBuffer ? [
      {
        filename: `HumanMetrix_Invoice_${details.invoiceNumber}.pdf`,
        content: pdfBuffer.toString('base64'),
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ] : undefined,
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Invoice email ${pdfBuffer ? 'with PDF' : '(no PDF)'} sent to ${details.partnerEmail} (ID: ${result.messageId})`);
    return { success: true, messageId: result.messageId };
  } else {
    throw new Error(`Failed to send invoice email`);
  }
}

export interface PartnerWelcomeDetails {
  partnerName: string;
  companyName: string;
  email: string;
  temporaryPassword: string;
  billingType: 'prepaid' | 'auto_bill' | 'invoice';
  freeTestsAllocated?: number;
  autoLoginToken?: string;
}

export async function sendPartnerWelcomeEmail(details: PartnerWelcomeDetails): Promise<{ success: boolean; messageId?: string }> {
  const baseUrl = getBaseUrl();
  const loginUrl = details.autoLoginToken 
    ? `${baseUrl}/auto-login/${details.autoLoginToken}` 
    : `${baseUrl}/login`;
  const developerDocsUrl = `${baseUrl}/developers`;
  
  const billingTypeDescriptions: Record<string, string> = {
    prepaid: 'Prepaid (purchase credit packages upfront)',
    auto_bill: 'Auto-Bill (monthly charges to card on file)',
    invoice: 'Invoice (monthly invoicing with payment terms)'
  };
  
  const msg = {
    to: details.email,
    subject: `Welcome to HumanMetrix Partner Programme - Your Account Details`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; background-color: #f1f5f9; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { background: #ffffff; padding: 35px; border: 1px solid #e2e8f0; border-top: none; }
            .section-box { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .section-box h3 { margin: 0 0 14px 0; color: #0c4a6e; font-size: 15px; font-weight: 600; }
            .credential-row { padding: 8px 0; border-bottom: 1px solid #e0f2fe; }
            .credential-row:last-child { border-bottom: none; }
            .credential-label { color: #0c4a6e; font-weight: 500; font-size: 14px; }
            .credential-value { font-family: 'SF Mono', 'Fira Code', monospace; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; color: #0369a1; font-size: 13px; }
            .notice { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px 15px; margin: 15px 0; color: #0c4a6e; font-size: 13px; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .section-box ul { margin: 0; padding-left: 20px; }
            .section-box li { margin: 8px 0; color: #334155; font-size: 14px; }
            .footer { text-align: center; padding: 25px; color: #64748b; font-size: 13px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e2e8f0; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HumanMetrix</h1>
              <p>Partner Programme</p>
            </div>
            <div class="content">
              <h2 style="margin-top: 0; color: #0c4a6e;">Hello ${details.partnerName},</h2>
              <p style="color: #334155;">Your B2B partner account for <strong>${details.companyName}</strong> has been created. You now have admin access to manage assessments for your organisation.</p>
              
              <div class="section-box">
                <h3>Your Login Credentials</h3>
                <div class="credential-row">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${details.email}</span>
                </div>
                <div class="credential-row">
                  <span class="credential-label">Temporary Password:</span>
                  <span class="credential-value">${details.temporaryPassword}</span>
                </div>
              </div>
              
              <div class="notice">
                <strong>Important:</strong> Please change your password after your first login for security purposes.
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button" style="color: white !important;">Log In to Your Account</a>
              </div>
              
              <div class="section-box">
                <h3>Your Account Details</h3>
                <ul>
                  <li><strong>Billing Type:</strong> ${billingTypeDescriptions[details.billingType] || details.billingType}</li>
                  ${details.freeTestsAllocated && details.freeTestsAllocated > 0 ? `<li><strong>Complimentary Tests:</strong> ${details.freeTestsAllocated} tests credited to your account</li>` : ''}
                  <li><strong>Role:</strong> Organisation Administrator</li>
                </ul>
              </div>
              
              <div class="section-box">
                <h3>Getting Started</h3>
                <ul>
                  <li>Log in with your credentials above</li>
                  <li>Generate API keys from your dashboard</li>
                  <li>Review our <a href="${developerDocsUrl}" style="color: #0891b2;">Developer Documentation</a> for integration guides</li>
                  <li>Start embedding assessments in your platform</li>
                </ul>
              </div>
              
              <p style="margin-top: 25px; color: #334155;">If you have any questions or need assistance getting started, please don't hesitate to contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a>.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.</p>
              <p style="margin-top: 10px;">
                <a href="${loginUrl}" style="color: #0891b2; text-decoration: none;">Log In</a> &middot; 
                <a href="${developerDocsUrl}" style="color: #0891b2; text-decoration: none;">Developer Docs</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Welcome to HumanMetrix Partner Programme

Hello ${details.partnerName},

Your B2B partner account for ${details.companyName} has been created. You now have admin access to manage assessments for your organisation.

YOUR LOGIN CREDENTIALS
----------------------
Email: ${details.email}
Temporary Password: ${details.temporaryPassword}

IMPORTANT: Please change your password after your first login for security purposes.

Log in at: ${loginUrl}

YOUR ACCOUNT DETAILS
--------------------
- Billing Type: ${billingTypeDescriptions[details.billingType] || details.billingType}
${details.freeTestsAllocated && details.freeTestsAllocated > 0 ? `- Complimentary Tests: ${details.freeTestsAllocated} tests credited to your account\n` : ''}- Role: Organisation Administrator

GETTING STARTED
---------------
1. Log in with your credentials above
2. Generate API keys from your dashboard
3. Review our Developer Documentation at ${developerDocsUrl}
4. Start embedding assessments in your platform

If you have any questions, contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Partner welcome email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Send general enquiry email from footer contact form to hello@humanmetrix.co.uk
export async function sendGeneralEnquiryEmail(details: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Website' },
    to: 'hello@humanmetrix.co.uk',
    replyTo: details.email,
    subject: `Website Enquiry: ${details.subject}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 25px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .field { margin-bottom: 15px; }
            .label { font-weight: 600; color: #374151; }
            .value { margin-top: 5px; }
            .message-box { background: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #0891b2; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 22px;">New Website Enquiry</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">From:</div>
                <div class="value">${details.name}</div>
              </div>
              <div class="field">
                <div class="label">Email:</div>
                <div class="value"><a href="mailto:${details.email}">${details.email}</a></div>
              </div>
              <div class="field">
                <div class="label">Subject:</div>
                <div class="value">${details.subject}</div>
              </div>
              <div class="message-box">
                <div class="label">Message:</div>
                <div class="value" style="white-space: pre-wrap; margin-top: 10px;">${details.message}</div>
              </div>
              <p style="margin-top: 25px; color: #6b7280; font-size: 13px;">
                This message was sent via the HumanMetrix website contact form.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
New Website Enquiry

From: ${details.name}
Email: ${details.email}
Subject: ${details.subject}

Message:
${details.message}

---
This message was sent via the HumanMetrix website contact form.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] General enquiry email sent (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Interface for partner bulk invitation email
interface PartnerBulkInvitationDetails {
  candidateEmail: string;
  candidateName?: string;
  assessmentTypes: string[];
  inviteToken: string;
  partnerCompanyName: string;
  partnerLogoUrl?: string | null;
  partnerPrimaryColor?: string | null;
  customMessage?: string | null;
  expiresAt?: Date;
  temporaryPassword?: string;
  isResume?: boolean;
}

// Send bulk invitation email from partner to candidate
export async function sendPartnerBulkInvitationEmail(details: PartnerBulkInvitationDetails, options?: { forceGmail?: boolean }) {
  const assessmentNames = details.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = assessmentNames.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = assessmentNames.join(', ');
  
  const baseUrl = getBaseUrl();
  
  const assessmentUrl = `${baseUrl}/start-assessment?token=${details.inviteToken}`;
  const candidateName = details.candidateName || 'there';
  const expiryDate = details.expiresAt 
    ? new Date(details.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  
  // Use partner branding or default HumanMetrix colors
  const primaryColor = details.partnerPrimaryColor || '#0891b2';
  const headerBg = details.partnerPrimaryColor 
    ? `background: ${details.partnerPrimaryColor};`
    : 'background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%);';
  
  const logoHtml = details.partnerLogoUrl 
    ? `<img src="${details.partnerLogoUrl}" alt="${details.partnerCompanyName}" style="max-height: 50px; max-width: 200px;" />`
    : `<h1 style="margin: 0; font-size: 24px;">${details.partnerCompanyName}</h1>`;
  
  const msg = {
    from: { email: fromEmail, name: `${details.partnerCompanyName} via HumanMetrix` },
    to: details.candidateEmail,
    subject: details.isResume 
      ? `Continue Your Assessments - ${details.partnerCompanyName}`
      : `Assessment Invitation from ${details.partnerCompanyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { ${headerBg} color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: ${primaryColor}; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .assessments { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
            ul { padding-left: 20px; margin: 10px 0; }
            li { margin: 8px 0; }
            .custom-message { background: #f3f4f6; padding: 15px; border-left: 4px solid ${primaryColor}; margin: 20px 0; font-style: italic; }
            .expiry-notice { color: #6b7280; font-size: 14px; margin-top: 20px; }
            .powered-by { font-size: 12px; color: #9ca3af; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${logoHtml}
              <p style="margin: 10px 0 0 0; opacity: 0.9;">${details.isResume ? 'Assessment Reminder' : 'Assessment Invitation'}</p>
            </div>
            <div class="content">
              <h2>Hello ${candidateName},</h2>
              <p>${details.isResume 
                ? `You have assessments in progress from ${details.partnerCompanyName}. Please continue where you left off:`
                : `${details.partnerCompanyName} has invited you to complete the following assessments:`}</p>
              
              <div class="assessments">
                <strong>${details.isResume ? 'Assessments in progress:' : 'Assessments to complete:'}</strong>
                <ul>
                  ${assessmentListHtml}
                </ul>
              </div>
              
              ${details.temporaryPassword ? `
              <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <strong style="color: #92400e;">Your Login Credentials</strong>
                <p style="margin: 10px 0 5px 0; color: #78350f;">An account has been created for you:</p>
                <p style="margin: 5px 0; font-family: monospace; background: white; padding: 8px; border-radius: 4px;">
                  <strong>Email:</strong> ${details.candidateEmail}<br>
                  <strong>Password:</strong> ${details.temporaryPassword}
                </p>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #92400e;">Please save these credentials. You can change your password after logging in.</p>
              </div>
              ` : ''}
              
              ${details.customMessage ? `<div class="custom-message">"${details.customMessage}"</div>` : ''}
              
              <p>${details.isResume 
                ? 'Your progress has been saved. Click the button below to pick up where you left off:'
                : 'These assessments are designed to evaluate your skills and capabilities. Click the button below to get started:'}</p>
              
              <div style="text-align: center;">
                <a href="${assessmentUrl}" class="button" style="color: white !important;">${details.isResume ? 'Continue Assessments' : 'Start Assessments'}</a>
              </div>
              
              ${expiryDate ? `<p class="expiry-notice">This invitation expires on ${expiryDate}. Please complete the assessments before this date.</p>` : ''}
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${assessmentUrl}" style="color: ${primaryColor};">${assessmentUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>Sent on behalf of ${details.partnerCompanyName}</p>
              <p class="powered-by" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <img src="${getBaseUrl()}/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 24px; width: auto;" />
                <span>Powered by HumanMetrix - AI Assessment Platform</span>
              </p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
${details.isResume ? `Continue Your Assessments - ${details.partnerCompanyName}` : `Assessment Invitation from ${details.partnerCompanyName}`}

Hello ${candidateName},

${details.isResume 
  ? `You have assessments in progress from ${details.partnerCompanyName}. Please continue where you left off:`
  : `${details.partnerCompanyName} has invited you to complete the following assessments:`}
${assessmentListText}

${details.temporaryPassword ? `
YOUR LOGIN CREDENTIALS
An account has been created for you:
Email: ${details.candidateEmail}
Password: ${details.temporaryPassword}

Please save these credentials. You can change your password after logging in.

` : ''}${details.customMessage ? `Message: "${details.customMessage}"\n` : ''}
${details.isResume ? 'Your progress has been saved. Click the link below to pick up where you left off:' : 'Click the link below to get started:'}
${assessmentUrl}

${expiryDate ? `This invitation expires on ${expiryDate}.` : ''}

---
Sent on behalf of ${details.partnerCompanyName}
Powered by HumanMetrix - AI Assessment Platform
© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  const logContext: EmailLogContext = {
    recipientType: 'b2b_test_taker',
    recipientName: details.candidateName || undefined,
    emailType: 'invitation',
    metadata: {
      partnerCompanyName: details.partnerCompanyName,
      assessmentTypes: details.assessmentTypes.join(', '),
    },
  };

  const result = options?.forceGmail
    ? await retrySendViaGmail(msg, logContext)
    : await sendEmail(msg, logContext);
  if (result.success) {
    console.log(`[Email] Partner bulk invitation email sent to ${details.candidateEmail} via ${options?.forceGmail ? 'Gmail (forced)' : 'default'} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Test-Taker Congratulatory Email - sent after assessment completion
interface B2BCongratulatoryEmailDetails {
  email: string;
  candidateName?: string;
  assessmentType: string;
  partnerCompanyName: string;
  paymentUrl: string;
  paymentAmount: string; // Formatted discounted price string (e.g., "£15.00")
  originalPaymentAmount?: string; // Formatted original price string (e.g., "£20.00")
  freeUnlockDate: Date; // 30 days after completion
}

export async function sendB2BCongratulatoryEmail(details: B2BCongratulatoryEmailDetails) {
  const assessmentName = formatAssessmentName(details.assessmentType);
  const displayName = details.candidateName || details.email;
  const freeDate = details.freeUnlockDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const hasDiscount = details.originalPaymentAmount && details.originalPaymentAmount !== details.paymentAmount;
  const priceDisplay = hasDiscount
    ? `<span style="text-decoration: line-through; color: #6b7280; font-size: 16px;">${details.originalPaymentAmount}</span> <span class="price">${details.paymentAmount}</span> <span style="color: #059669; font-size: 14px; font-weight: 600;">(25% off)</span>`
    : `<span class="price">${details.paymentAmount}</span>`;
  const textPriceDisplay = hasDiscount
    ? `${details.originalPaymentAmount} → ${details.paymentAmount} (25% off)`
    : details.paymentAmount;
  
  const msg = {
    to: details.email,
    subject: `Congratulations! You've completed your ${assessmentName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .options-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .option { padding: 15px; margin: 10px 0; border-radius: 6px; }
            .option-immediate { background: #e0f2fe; border-left: 4px solid #0891b2; }
            .option-free { background: #f0fdf4; border-left: 4px solid #10b981; }
            .price { font-size: 24px; font-weight: bold; color: #0891b2; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="https://humanmetrix.co.uk/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 40px; width: auto;" />
                <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Assessment Complete</span>
              </div>
              
              <h2 style="text-align: center;">Congratulations, ${displayName}!</h2>
              
              <p style="text-align: center;">You've successfully completed the <strong>${assessmentName}</strong> as part of your assessment with <strong>${details.partnerCompanyName}</strong>.</p>
              
              <div class="options-box">
                <h3 style="margin-top: 0;">Access Your Results</h3>
                
                <div class="option option-immediate">
                  <strong>Immediate Access</strong>
                  <p style="margin: 5px 0;">Get your detailed results right now for just ${priceDisplay}</p>
                  <p style="margin: 5px 0; font-size: 14px; color: #0369a1;">View your detailed results with insights and recommendations on your dashboard.</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${details.paymentUrl}" class="button" style="color: white !important;">Unlock Results Now</a>
                </div>
                
                <div class="option option-free" style="margin-top: 20px;">
                  <strong>Free Access</strong>
                  <p style="margin: 5px 0;">Your results will be available for free on <strong>${freeDate}</strong></p>
                  <p style="margin: 5px 0; font-size: 14px; color: #059669;">We'll send you an email when your results are ready.</p>
                </div>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Thank you for completing your assessment. Your insights are valuable!
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Congratulations, ${displayName}!

You've successfully completed the ${assessmentName} as part of your assessment with ${details.partnerCompanyName}.

ACCESS YOUR RESULTS
==================

IMMEDIATE ACCESS
Get your detailed results right now for just ${textPriceDisplay}
View your detailed results with insights and recommendations on your dashboard.

Click here to unlock your results: ${details.paymentUrl}

FREE ACCESS
Your results will be available for free on ${freeDate}.
We'll send you an email when your results are ready.

---
Thank you for completing your assessment!
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B congratulatory email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B All Assessments Complete Email - sent when all 4 assessments are completed with bulk discount
interface B2BAllCompleteEmailDetails {
  email: string;
  candidateName?: string;
  partnerCompanyName: string;
  completedAssessments: string[];
  paidAssessments: string[];
  unpaidAssessments: string[];
  paymentUrl: string;
  bundlePrice: string;
  originalTotalPrice: string;
  discountPercentage: number;
  freeUnlockDate: Date;
}

export async function sendB2BAllCompleteEmail(details: B2BAllCompleteEmailDetails) {
  const displayName = details.candidateName || details.email;
  const freeDate = details.freeUnlockDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  const assessmentsList = details.completedAssessments.map(formatAssessmentName);
  const assessmentsText = assessmentsList.join(', ');
  
  const unpaidList = details.unpaidAssessments.map(formatAssessmentName);
  const paidList = details.paidAssessments.map(formatAssessmentName);
  const unpaidCount = details.unpaidAssessments.length;
  const showBundle = unpaidCount > 1 && details.discountPercentage > 0;
  
  const assessmentCount = details.completedAssessments.length;
  const countText = assessmentCount === 4 ? 'all four assessments' : `all ${assessmentCount} assigned assessments`;
  
  const unpaidHtml = unpaidList.map(a => `<li style="margin: 5px 0;">${a}</li>`).join('');
  const paidHtml = paidList.map(a => `<li style="margin: 5px 0;">${a} <span style="color: #059669; font-weight: 600;">✓ Paid</span></li>`).join('');
  
  const msg = {
    to: details.email,
    subject: showBundle 
      ? `🎉 All Assessments Complete - Unlock All Results with ${details.discountPercentage}% Bundle Discount!`
      : `🎉 All Assessments Complete - Unlock Your Results!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; font-size: 18px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .celebration-badge { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; border-radius: 25px; display: inline-block; font-weight: 700; margin: 10px 0; font-size: 16px; }
            .bundle-box { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid #f59e0b; }
            .price-container { text-align: center; margin: 15px 0; }
            .original-price { text-decoration: line-through; color: #6b7280; font-size: 20px; }
            .bundle-price { font-size: 36px; font-weight: bold; color: #059669; }
            .savings-badge { background: #dc2626; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
            .assessments-list { background: #f0fdf4; padding: 15px 25px; border-radius: 8px; border-left: 4px solid #10b981; }
            .option-free { background: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="https://humanmetrix.co.uk/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 40px; width: auto;" />
                <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="celebration-badge">🎉 All Assessments Complete!</span>
              </div>
              
              <h2 style="text-align: center; margin-top: 20px;">Outstanding Achievement, ${displayName}!</h2>
              
              <p style="text-align: center; font-size: 16px;">You've completed ${countText} as part of your evaluation with <strong>${details.partnerCompanyName}</strong>. This is a significant accomplishment!</p>
              
              <div class="assessments-list">
                <h4 style="margin: 0 0 10px 0; color: #059669;">✓ Completed Assessments:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  ${paidHtml}${unpaidHtml}
                </ul>
              </div>
              
              ${unpaidCount > 0 ? `
              <div class="bundle-box">
                ${showBundle ? `
                <h3 style="margin: 0 0 15px 0; text-align: center; color: #92400e;">🎁 Exclusive Bundle Offer</h3>
                <p style="text-align: center; margin: 0;">Unlock <strong>${unpaidCount}</strong> remaining assessment result${unpaidCount > 1 ? 's' : ''} together and save big!</p>
                
                <div class="price-container">
                  <span class="original-price">${details.originalTotalPrice}</span>
                  <br/>
                  <span class="bundle-price">${details.bundlePrice}</span>
                  <br/>
                  <span class="savings-badge">SAVE ${details.discountPercentage}%</span>
                </div>
                ` : `
                <h3 style="margin: 0 0 15px 0; text-align: center; color: #92400e;">Unlock Your Results</h3>
                <div class="price-container">
                  <span class="bundle-price">${details.bundlePrice}</span>
                </div>
                `}
                
                <p style="text-align: center; font-size: 14px; color: #78350f; margin: 15px 0 0 0;">
                  View detailed results with insights and recommendations on your dashboard.
                </p>
              </div>
              
              <div style="text-align: center;">
                <a href="${details.paymentUrl}" class="button" style="color: white !important;">Unlock Results Now</a>
              </div>
              ` : ''}
              
              <div class="option-free">
                <strong style="color: #059669;">🕐 Free Access Option</strong>
                <p style="margin: 5px 0 0 0; font-size: 14px;">All your results will be available for free on <strong>${freeDate}</strong>. We'll send you an email when they're ready.</p>
              </div>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
🎉 OUTSTANDING ACHIEVEMENT, ${displayName}!

You've completed ${countText} as part of your evaluation with ${details.partnerCompanyName}. This is a significant accomplishment!

COMPLETED ASSESSMENTS:
${paidList.length > 0 ? paidList.map(a => `${a} (Paid)`).join('\n') + '\n' : ''}${unpaidList.join('\n')}
${unpaidCount > 0 ? `
═══════════════════════════════════════
${showBundle ? `🎁 EXCLUSIVE BUNDLE OFFER` : `UNLOCK YOUR RESULTS`}
═══════════════════════════════════════

${showBundle ? `Unlock ${unpaidCount} remaining assessment results together and save ${details.discountPercentage}%!

Original Price: ${details.originalTotalPrice}
Bundle Price: ${details.bundlePrice}
SAVINGS: ${details.discountPercentage}% OFF!` : `Price: ${details.bundlePrice}`}

View detailed results with insights and recommendations on your dashboard.

Click here to unlock results: ${details.paymentUrl}` : ''}

FREE ACCESS
All your results will be available for free on ${freeDate}.
We'll send you an email when they're ready.

---
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B all-complete email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Results Ready Notification - sent to existing users after account linking
interface B2BResultsReadyNotificationDetails {
  email: string;
  candidateName?: string;
  partnerName: string;
  dashboardUrl: string;
}

export async function sendB2BResultsReadyEmail(details: B2BResultsReadyNotificationDetails) {
  const displayName = details.candidateName || details.email;
  
  const msg = {
    to: details.email,
    subject: `Your assessment results are ready - ${details.partnerName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .info-box { background: #f0f9ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0891b2; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="https://humanmetrix.co.uk/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 40px; width: auto;" />
                <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2 style="text-align: center;">Your Results Are Ready</h2>
              
              <p>Hi ${displayName},</p>
              
              <p>Your assessment results from <strong>${details.partnerName}</strong> are now available on your dashboard.</p>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>Log in with your existing account</strong> to view your detailed results, insights, and recommendations.</p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #6b7280;">If you've forgotten your password, use the "Forgot Password" link on the login page to reset it.</p>
              </div>
              
              <div style="text-align: center;">
                <a href="${details.dashboardUrl}" class="button" style="color: white !important;">View Your Results</a>
              </div>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${displayName},\n\nYour assessment results from ${details.partnerName} are now available.\n\nLog in with your existing account at ${details.dashboardUrl} to view your detailed results.\n\nIf you've forgotten your password, use the "Forgot Password" link on the login page.\n\n© ${new Date().getFullYear()} HumanMetrix`,
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B results-ready email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Test-Taker Results Email - sent after payment with PDF attachment
interface B2BResultsEmailDetails {
  email: string;
  candidateName?: string;
  assessmentType: string;
  partnerCompanyName: string;
  pdfBuffer: Buffer; // PDF file as buffer
  pdfFilename: string; // e.g., "FIT_Assessment_Results.pdf"
}

export async function sendB2BResultsEmail(details: B2BResultsEmailDetails) {
  const assessmentName = formatAssessmentName(details.assessmentType);
  const candidateName = details.candidateName || 'there';
  const baseUrl = getBaseUrl();
  
  const msg = {
    to: details.email,
    subject: `Your ${assessmentName} Results Are Ready`,
    attachments: [
      {
        filename: details.pdfFilename,
        content: details.pdfBuffer.toString('base64'),
        type: 'application/pdf',
        disposition: 'attachment',
      },
    ],
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .attachment-box { background: #f0f9ff; border: 2px dashed #0891b2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .pdf-icon { font-size: 48px; margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Results Ready</span>
              </div>
              
              <h2 style="text-align: center;">Hello ${candidateName},</h2>
              
              <p style="text-align: center;">Thank you for your payment! Your <strong>${assessmentName}</strong> results are now available.</p>
              
              <div class="attachment-box">
                <p style="margin: 0; font-weight: 600; color: #0891b2; font-size: 18px;">${details.pdfFilename}</p>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Your detailed assessment report is attached to this email.</p>
              </div>
              
              <h3>What's in your report?</h3>
              <ul>
                <li>Your overall assessment score and percentile ranking</li>
                <li>Detailed breakdown of your performance across key areas</li>
                <li>Personalized insights and recommendations</li>
                <li>Industry benchmarking data</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Your results have also been shared with ${details.partnerCompanyName} as part of your application process.
              </p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${candidateName},

Thank you for your payment! Your ${assessmentName} results are now available.

ATTACHED: ${details.pdfFilename}

Your detailed assessment report is attached to this email.

WHAT'S IN YOUR REPORT?
- Your overall assessment score and percentile ranking
- Detailed breakdown of your performance across key areas
- Personalized insights and recommendations
- Industry benchmarking data

Your results have also been shared with ${details.partnerCompanyName} as part of your application process.

---
Questions about your results? Contact us at ${baseUrl}/contact
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B results email with PDF sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Results Email with Download Link - for large PDFs stored in object storage
interface B2BResultsDownloadLinkDetails {
  email: string;
  candidateName?: string;
  assessmentType: string;
  partnerCompanyName: string;
  downloadUrl: string;
  expiryDays: number;
}

export async function sendB2BResultsEmailWithDownloadLink(details: B2BResultsDownloadLinkDetails) {
  const assessmentName = formatAssessmentName(details.assessmentType);
  const candidateName = details.candidateName || 'there';
  const baseUrl = getBaseUrl();
  
  const msg = {
    to: details.email,
    subject: `Your ${assessmentName} Results Are Ready - Download Your Report`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .download-box { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); padding: 25px; border-radius: 12px; margin: 20px 0; text-align: center; }
            .download-btn { display: inline-block; background: white; color: #0891b2; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; }
            .expiry-note { background: #fef3c7; border: 1px solid #fcd34d; padding: 12px; border-radius: 6px; margin: 15px 0; font-size: 14px; color: #92400e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Results Ready</span>
              </div>
              
              <h2 style="text-align: center;">Hello ${candidateName},</h2>
              
              <p style="text-align: center;">Thank you for your payment! Your <strong>${assessmentName}</strong> results are now available for download.</p>
              
              <div class="download-box">
                <p style="margin: 0 0 15px 0; color: white; font-size: 16px;">Your detailed PDF report is ready</p>
                <a href="${details.downloadUrl}" class="download-btn">Download Your Report</a>
              </div>
              
              <div class="expiry-note">
                <strong>⏰ Important:</strong> This download link will expire in ${details.expiryDays} days. Please download your report soon.
              </div>
              
              <h3>What's in your report?</h3>
              <ul>
                <li>Your overall assessment score and percentile ranking</li>
                <li>Detailed breakdown of your performance across key areas</li>
                <li>Personalized insights and recommendations</li>
                <li>Industry benchmarking data</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Your results have also been shared with ${details.partnerCompanyName} as part of your application process.
              </p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${candidateName},

Thank you for your payment! Your ${assessmentName} results are now available for download.

DOWNLOAD YOUR REPORT:
${details.downloadUrl}

IMPORTANT: This download link will expire in ${details.expiryDays} days. Please download your report soon.

WHAT'S IN YOUR REPORT?
- Your overall assessment score and percentile ranking
- Detailed breakdown of your performance across key areas
- Personalized insights and recommendations
- Industry benchmarking data

Your results have also been shared with ${details.partnerCompanyName} as part of your application process.

---
Questions about your results? Contact us at ${baseUrl}/contact
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B results email with download link sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Results Email with Multiple PDF Attachments - for users with multiple assessments
interface B2BMultiplePDFEmailDetails {
  email: string;
  candidateName?: string;
  assessmentLabel: string; // e.g., "FIT" or "2 Assessments"
  partnerCompanyName: string;
  resultsUrl: string;
  pdfAttachments: Array<{ filename: string; content: Buffer }>;
  receiptDetails?: {
    amount: number;
    currency: string;
    transactionId: string;
    purchaseDate: Date;
  };
}

export async function sendB2BResultsEmailWithMultiplePDFs(details: B2BMultiplePDFEmailDetails) {
  const candidateName = details.candidateName || 'there';
  const baseUrl = getBaseUrl();
  
  // Build receipt HTML if available
  let receiptHtml = '';
  if (details.receiptDetails) {
    const formattedAmount = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: details.receiptDetails.currency,
    }).format(details.receiptDetails.amount / 100);
    
    receiptHtml = `
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #374151;">Payment Receipt</h4>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Amount:</strong> ${formattedAmount}</p>
        <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${details.receiptDetails.purchaseDate.toLocaleDateString('en-GB')}</p>
        <p style="margin: 5px 0; font-size: 14px; color: #6b7280;"><strong>Transaction ID:</strong> ${details.receiptDetails.transactionId}</p>
      </div>
    `;
  }
  
  // Build attachments list HTML
  const attachmentsListHtml = details.pdfAttachments.map(att => 
    `<li style="margin: 5px 0;">${att.filename}</li>`
  ).join('');
  
  const msg = {
    to: details.email,
    subject: `Your ${details.assessmentLabel} Assessment Results Are Ready`,
    attachments: details.pdfAttachments.map(att => ({
      filename: att.filename,
      content: att.content.toString('base64'),
      type: 'application/pdf',
      disposition: 'attachment' as const,
    })),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .attachment-box { background: #f0f9ff; border: 2px dashed #0891b2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Payment Successful</span>
              </div>
              
              <h2 style="text-align: center;">Hello ${candidateName},</h2>
              
              <p style="text-align: center;">Thank you for your purchase! Your assessment results are now available.</p>
              
              <div class="attachment-box">
                <p style="margin: 0; font-weight: 600; color: #0891b2; font-size: 18px;">Attached Reports:</p>
                <ul style="list-style: none; padding: 0; margin: 10px 0;">
                  ${attachmentsListHtml}
                </ul>
                <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">Your detailed assessment reports are attached to this email.</p>
              </div>
              
              ${receiptHtml}
              
              <div style="text-align: center; margin: 25px 0;">
                <a href="${details.resultsUrl}" class="button">View Results in Dashboard</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Your results have also been shared with ${details.partnerCompanyName} as part of your application process.
              </p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${candidateName},

Thank you for your purchase! Your ${details.assessmentLabel} assessment results are now available.

ATTACHED REPORTS:
${details.pdfAttachments.map(att => `- ${att.filename}`).join('\n')}

Your detailed assessment reports are attached to this email.

View your results in the dashboard: ${details.resultsUrl}

Your results have also been shared with ${details.partnerCompanyName} as part of your application process.

---
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B results email with ${details.pdfAttachments.length} PDF(s) sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Bundle Results Email - One email with all assessment PDFs attached
interface BundleResultsEmailDetails {
  email: string;
  partnerCompanyName: string;
  attachments: Array<{ filename: string; buffer: Buffer; assessmentType: string }>;
}

export async function sendBundleResultsEmail(details: BundleResultsEmailDetails) {
  const baseUrl = getBaseUrl();
  const assessmentCount = details.attachments.length;
  const assessmentNames = details.attachments.map(a => formatAssessmentName(a.assessmentType)).join(', ');
  
  const attachmentsListHtml = details.attachments.map(att => 
    `<li style="margin: 8px 0; padding: 8px; background: #f0f9ff; border-radius: 4px;">
      <span style="font-size: 20px; margin-right: 8px;">📄</span>
      ${att.filename}
    </li>`
  ).join('');
  
  const msg = {
    to: details.email,
    subject: `Your ${assessmentCount} Assessment Results Are Ready`,
    attachments: details.attachments.map(att => ({
      filename: att.filename,
      content: att.buffer.toString('base64'),
      type: 'application/pdf',
      disposition: 'attachment',
    })),
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .attachment-box { background: #f0f9ff; border: 2px dashed #0891b2; padding: 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional AI Assessments</p>
            </div>
            <div class="content">
              <p style="margin-top: 0;">Hello,</p>
              
              <p>Your payment has been processed and your assessment results are now available.</p>
              
              <div class="attachment-box">
                <h3 style="margin-top: 0; color: #0891b2;">📎 Your Reports (${assessmentCount} attached)</h3>
                <p style="margin-bottom: 10px;">The following PDF reports are attached to this email:</p>
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${attachmentsListHtml}
                </ul>
              </div>
              
              <h3>What's In Your Reports?</h3>
              <ul>
                <li>Your overall assessment scores and percentile rankings</li>
                <li>Detailed breakdown of your performance across key areas</li>
                <li>Personalized insights and recommendations</li>
                <li>Industry benchmarking data</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px;">Your results have also been shared with ${details.partnerCompanyName} as part of your application process.</p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello,

Your payment has been processed and your assessment results are now available.

ATTACHED REPORTS:
${details.attachments.map(att => `- ${att.filename}`).join('\n')}

Your detailed assessment reports are attached to this email.

WHAT'S IN YOUR REPORTS?
- Your overall assessment scores and percentile rankings
- Detailed breakdown of your performance across key areas
- Personalized insights and recommendations
- Industry benchmarking data

Your results have also been shared with ${details.partnerCompanyName} as part of your application process.

---
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Bundle results email with ${assessmentCount} PDF(s) sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Send partner team invitation email
export interface PartnerTeamInvitationDetails {
  email: string;
  inviteeName?: string;
  inviterName: string;
  companyName: string;
  inviteToken: string;
  role: string;
}

export async function sendPartnerTeamInvitationEmail(details: PartnerTeamInvitationDetails): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = getBaseUrl();
  
  const acceptUrl = `${baseUrl}/partner/accept-invite/${details.inviteToken}`;
  const greeting = details.inviteeName ? `Hello ${details.inviteeName},` : 'Hello,';
  const roleDisplay = details.role === 'admin' ? 'Administrator' : details.role === 'member' ? 'Team Member' : 'Viewer';
  
  const msg = {
    to: details.email,
    subject: `You've been invited to join ${details.companyName} on HumanMetrix`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; }
            .invite-badge { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; text-align: center; }
            .invite-badge span { color: #059669; font-weight: 600; font-size: 14px; }
            .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 500; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #0e7490; }
            .info-section { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .info-section h3 { margin: 0 0 12px 0; color: #0369a1; font-size: 16px; }
            .info-section ul { margin: 0; padding-left: 20px; }
            .info-section li { margin: 8px 0; color: #0c4a6e; }
            .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 15px; margin: 15px 0; color: #92400e; font-size: 13px; }
            .footer { text-align: center; padding: 25px; color: #6b7280; font-size: 14px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HumanMetrix</h1>
              <p>Team Invitation</p>
            </div>
            <div class="content">
              <div class="invite-badge">
                <span>You've Been Invited!</span>
              </div>
              
              <h2 style="margin-top: 0;">${greeting}</h2>
              <p><strong>${details.inviterName}</strong> has invited you to join <strong>${details.companyName}</strong>'s team on HumanMetrix.</p>
              
              <p>Your role: <span class="role-badge">${roleDisplay}</span></p>
              
              <div style="text-align: center;">
                <a href="${acceptUrl}" class="button" style="color: white !important;">Accept Invitation</a>
              </div>
              
              <div class="info-section">
                <h3>What You'll Have Access To</h3>
                <ul>
                  <li>View assessment results and candidate data</li>
                  <li>Access analytics and reporting</li>
                  ${details.role === 'admin' ? '<li>Manage team members and settings</li>' : ''}
                  ${details.role !== 'viewer' ? '<li>Invite candidates to assessments</li>' : ''}
                </ul>
              </div>
              
              <div class="warning">
                <strong>Note:</strong> This invitation will expire in 7 days. Please accept it before then.
              </div>
              
              <p style="margin-top: 25px;">If you have any questions, please contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a>.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Team Invitation - HumanMetrix

${greeting}

${details.inviterName} has invited you to join ${details.companyName}'s team on HumanMetrix.

Your role: ${roleDisplay}

Accept the invitation by visiting: ${acceptUrl}

What You'll Have Access To:
- View assessment results and candidate data
- Access analytics and reporting
${details.role === 'admin' ? '- Manage team members and settings\n' : ''}${details.role !== 'viewer' ? '- Invite candidates to assessments\n' : ''}

Note: This invitation will expire in 7 days. Please accept it before then.

If you have any questions, please contact us at hello@humanmetrix.co.uk.

---
© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.
If you didn't expect this invitation, you can safely ignore this email.
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Partner team invitation email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

interface PartnerTeamCredentialsDetails {
  email: string;
  name?: string;
  companyName: string;
  role: string;
  temporaryPassword: string;
}

export async function sendPartnerTeamCredentialsEmail(details: PartnerTeamCredentialsDetails): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const baseUrl = getBaseUrl();
  
  const loginUrl = `${baseUrl}/login`;
  const greeting = details.name ? `Hello ${details.name},` : 'Hello,';
  const roleDisplay = details.role === 'admin' ? 'Administrator' : details.role === 'member' ? 'Team Member' : 'Viewer';
  
  const msg = {
    to: details.email,
    subject: `Your HumanMetrix Login Credentials - ${details.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0; }
            .header h1 { margin: 0; font-size: 28px; font-weight: 700; }
            .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
            .content { background: #ffffff; padding: 35px; border: 1px solid #e5e7eb; border-top: none; }
            .success-badge { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; text-align: center; }
            .success-badge span { color: #059669; font-weight: 600; font-size: 14px; }
            .credentials-box { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .credentials-box h3 { margin: 0 0 15px 0; color: #1e293b; font-size: 16px; }
            .credential-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
            .credential-item:last-child { border-bottom: none; }
            .credential-label { color: #64748b; font-size: 14px; }
            .credential-value { color: #0f172a; font-weight: 600; font-family: monospace; font-size: 14px; }
            .role-badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 4px; font-size: 13px; font-weight: 500; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #0e7490; }
            .warning { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 12px 15px; margin: 15px 0; color: #92400e; font-size: 13px; }
            .security-note { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 15px; margin: 15px 0; color: #991b1b; font-size: 13px; }
            .footer { text-align: center; padding: 25px; color: #6b7280; font-size: 14px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HumanMetrix</h1>
              <p>Your Account is Ready</p>
            </div>
            <div class="content">
              <div class="success-badge">
                <span>Welcome to the Team!</span>
              </div>
              
              <h2 style="margin-top: 0;">${greeting}</h2>
              <p>Your account has been created for <strong>${details.companyName}</strong>'s team on HumanMetrix. You can now log in to access the partner dashboard.</p>
              
              <p>Your role: <span class="role-badge">${roleDisplay}</span></p>
              
              <div class="credentials-box">
                <h3>Your Login Credentials</h3>
                <div class="credential-item">
                  <span class="credential-label">Email:</span>
                  <span class="credential-value">${details.email}</span>
                </div>
                <div class="credential-item">
                  <span class="credential-label">Temporary Password:</span>
                  <span class="credential-value">${details.temporaryPassword}</span>
                </div>
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button" style="color: white !important;">Log In Now</a>
              </div>
              
              <div class="security-note">
                <strong>Security Reminder:</strong> For your security, please change your password after your first login. Go to Account Settings to update your password.
              </div>
              
              <div class="warning">
                <strong>Keep this email secure:</strong> This email contains your login credentials. Do not share this email or your password with anyone.
              </div>
              
              <p style="margin-top: 25px;">If you have any questions, please contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a>.</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.</p>
              <p style="margin-top: 10px; font-size: 12px; color: #9ca3af;">
                If you didn't request this account, please contact support immediately.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Your HumanMetrix Account is Ready - ${details.companyName}

${greeting}

Your account has been created for ${details.companyName}'s team on HumanMetrix. You can now log in to access the partner dashboard.

Your role: ${roleDisplay}

YOUR LOGIN CREDENTIALS
----------------------
Email: ${details.email}
Temporary Password: ${details.temporaryPassword}

Log in at: ${loginUrl}

SECURITY REMINDER: For your security, please change your password after your first login.

Keep this email secure: This email contains your login credentials. Do not share this email or your password with anyone.

If you have any questions, please contact us at hello@humanmetrix.co.uk.

---
© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.
If you didn't request this account, please contact support immediately.
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Partner team credentials email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// B2B Results Unlocked Email - sent immediately after successful payment
export async function sendB2BResultsUnlockedEmail(
  email: string,
  assessmentType: string,
  partnerName: string,
  resultsUrl: string,
  receiptDetails?: {
    amount: number;
    currency: string;
    assessmentTypes: string[];
    transactionId?: string;
    purchaseDate: Date;
  }
) {
  const assessmentName = formatAssessmentName(assessmentType);
  const baseUrl = getBaseUrl();
  
  // Format receipt details if provided
  const receiptNumber = receiptDetails?.transactionId || `REC-${Date.now()}`;
  const formattedDate = receiptDetails?.purchaseDate 
    ? receiptDetails.purchaseDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedAmount = receiptDetails 
    ? `${receiptDetails.currency} ${receiptDetails.amount.toLocaleString()}`
    : '';
  const assessmentsList = receiptDetails?.assessmentTypes
    ? receiptDetails.assessmentTypes.map(t => formatAssessmentName(t)).join(', ')
    : assessmentName;
  
  // Receipt section HTML
  const receiptSection = receiptDetails ? `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px 0; color: #374151; font-size: 16px;">Payment Receipt</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Receipt Number:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; font-size: 14px;">${receiptNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Date:</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Assessment(s):</td>
          <td style="padding: 8px 0; text-align: right; font-size: 14px;">${assessmentsList}</td>
        </tr>
        <tr style="border-top: 1px solid #e5e7eb;">
          <td style="padding: 12px 0 0 0; color: #374151; font-weight: 600;">Total Paid:</td>
          <td style="padding: 12px 0 0 0; text-align: right; font-weight: 700; font-size: 18px; color: #059669;">${formattedAmount}</td>
        </tr>
      </table>
    </div>
  ` : '';
  
  // Receipt text section
  const receiptText = receiptDetails ? `
PAYMENT RECEIPT
---------------
Receipt Number: ${receiptNumber}
Date: ${formattedDate}
Assessment(s): ${assessmentsList}
Total Paid: ${formattedAmount}
` : '';
  
  const msg = {
    to: email,
    subject: `Your ${assessmentName} Results Are Now Unlocked! - Payment Receipt`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="${baseUrl}/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 40px; width: auto;" />
                <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Payment Successful</span>
              </div>
              
              <h2 style="text-align: center;">Your Results Are Ready!</h2>
              
              <p style="text-align: center;">Thank you for your payment! Your <strong>${assessmentName}</strong> results are now unlocked and ready for viewing.</p>
              
              ${receiptSection}
              
              <div style="text-align: center;">
                <a href="${resultsUrl}" class="button" style="color: white !important;">View Your Results</a>
              </div>
              
              <h3>What You'll Find in Your Results:</h3>
              <ul>
                <li>Your overall assessment score and percentile ranking</li>
                <li>Detailed breakdown of your performance</li>
                <li>Personalized insights and recommendations</li>
                <li>Industry benchmarking data</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Assessment completed as part of your evaluation with <strong>${partnerName}</strong>.
              </p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Your ${assessmentName} Results Are Now Unlocked!

Thank you for your payment! Your results are now unlocked and ready for viewing.
${receiptText}
View your results here: ${resultsUrl}

WHAT YOU'LL FIND IN YOUR RESULTS:
- Your overall assessment score and percentile ranking
- Detailed breakdown of your performance
- Personalized insights and recommendations
- Industry benchmarking data

Assessment completed as part of your evaluation with ${partnerName}.

---
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] B2B results unlocked email sent to ${email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

export interface ResultsReadyEmailDetails {
  email: string;
  candidateName?: string;
  assessmentTypes: string[];
  partnerCompanyName: string;
  hasExistingAccount: boolean;
  sessionId?: string;
  partnerInvitationId?: string;
}

export async function sendResultsReadyEmail(details: ResultsReadyEmailDetails) {
  const baseUrl = getBaseUrl();
  const candidateName = details.candidateName || 'there';
  
  const assessmentNames = details.assessmentTypes.map(t => formatAssessmentName(t));
  const assessmentListHtml = assessmentNames.map(name => `<li>${name}</li>`).join('');
  const assessmentListText = assessmentNames.join(', ');
  const subjectLabel = assessmentNames.length === 1 ? assessmentNames[0] : `${assessmentNames.length} Assessment`;
  
  let ctaUrl: string;
  let ctaLabel: string;
  let ctaNote: string;
  
  const dashboardPath = details.partnerInvitationId 
    ? `dashboard?view=candidate&scrollToSeries=${details.partnerInvitationId}`
    : 'dashboard';
  
  if (details.hasExistingAccount) {
    ctaUrl = `${baseUrl}/${dashboardPath}`;
    ctaLabel = 'View Your Results';
    ctaNote = 'Log in to your HumanMetrix account to view your detailed results and insights.';
  } else {
    ctaUrl = `${baseUrl}/auth?email=${encodeURIComponent(details.email)}&redirect=${encodeURIComponent(dashboardPath)}`;
    ctaLabel = 'Create Account & View Results';
    ctaNote = 'Create a free HumanMetrix account to access your detailed results and insights.';
  }
  
  console.log(`[Email] Results ready email CTA URL: ${ctaUrl} (partnerInvitationId: ${details.partnerInvitationId || 'none'})`);
  
  const msg = {
    to: details.email,
    subject: `Your ${subjectLabel} Results Are Ready`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: 600; margin: 10px 0; }
            .assessments { background: #f0f9ff; border: 1px solid #bae6fd; padding: 15px 20px; border-radius: 8px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 12px;">
                <img src="${baseUrl}/assets/humanmetrix-logo.png" alt="HumanMetrix" style="height: 40px; width: auto;" />
                <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              </div>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div style="text-align: center;">
                <span class="success-badge">Results Ready</span>
              </div>
              
              <h2 style="text-align: center;">Hello ${candidateName},</h2>
              
              <p style="text-align: center;">Your assessment results are now available!</p>
              
              <div class="assessments">
                <h4 style="margin: 0 0 8px 0; color: #0e7490;">Completed Assessments:</h4>
                <ul style="margin: 0; padding-left: 20px;">
                  ${assessmentListHtml}
                </ul>
              </div>
              
              <p style="text-align: center; color: #6b7280; font-size: 14px;">${ctaNote}</p>
              
              <div style="text-align: center;">
                <a href="${ctaUrl}" class="button" style="color: white !important;">${ctaLabel}</a>
              </div>
              
              <h3>From your dashboard you can:</h3>
              <ul>
                <li>View your detailed scores and percentile rankings</li>
                <li>See personalized insights and recommendations</li>
                <li>Download or share your results</li>
                <li>Compare your performance across assessments</li>
              </ul>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                Assessment completed as part of your evaluation with <strong>${details.partnerCompanyName}</strong>.
              </p>
            </div>
            <div class="footer">
              <p>Questions about your results? <a href="${baseUrl}/contact" style="color: #0891b2;">Contact us</a></p>
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Hello ${candidateName},

Your assessment results are now available!

COMPLETED ASSESSMENTS: ${assessmentListText}

${ctaNote}

${ctaLabel}: ${ctaUrl}

FROM YOUR DASHBOARD YOU CAN:
- View your detailed scores and percentile rankings
- See personalized insights and recommendations
- Download or share your results
- Compare your performance across assessments

Assessment completed as part of your evaluation with ${details.partnerCompanyName}.

---
Questions about your results? Visit ${baseUrl}/contact
(c) ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Results ready email sent to ${details.email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Email Verification Code - sent to verify email before starting B2B assessment
export async function sendEmailVerificationCode(
  email: string,
  code: string,
  partnerName?: string
) {
  const baseUrl = getBaseUrl();
  
  const partnerText = partnerName ? ` for ${partnerName}` : '';
  
  const msg = {
    to: email,
    subject: `Your verification code: ${code}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
            .code-box { background: #f0f9ff; border: 2px solid #0891b2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0891b2; font-family: monospace; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2 style="text-align: center;">Verify Your Email</h2>
              
              <p style="text-align: center;">Enter the following code to verify your email address and start your assessment${partnerText}:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
                <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">This code expires in 10 minutes</p>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Your HumanMetrix Verification Code

Enter this code to verify your email and start your assessment${partnerText}:

${code}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.

---
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Verification code email sent to ${email} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// ============================================================================
// BILLING FAILURE & CARD EXPIRY NOTIFICATIONS
// ============================================================================

export interface BillingFailureDetails {
  partnerEmail: string;
  companyName: string;
  failureReason: string;
  failedAttempts: number;
  amountDue: number;
  currency: string;
  nextRetryDate?: Date;
  updatePaymentUrl: string;
}

export async function sendBillingFailureNotification(details: BillingFailureDetails): Promise<{ success: boolean }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  
  const isLastAttempt = details.failedAttempts >= 3;
  const urgencyColor = isLastAttempt ? '#dc2626' : '#f59e0b';
  const urgencyText = isLastAttempt 
    ? 'URGENT: Your API access has been suspended due to payment failure.'
    : `Warning: We were unable to process your payment. Attempt ${details.failedAttempts} of 3.`;
  
  const reasonDisplay = {
    'card_declined': 'Your card was declined',
    'insufficient_funds': 'Insufficient funds',
    'expired_card': 'Your card has expired',
    'no_payment_method': 'No payment method on file',
    'processing_error': 'Payment processing error',
  }[details.failureReason] || details.failureReason;
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Billing' },
    to: details.partnerEmail,
    subject: isLastAttempt 
      ? `URGENT: API Access Suspended - Payment Required`
      : `Payment Failed - Action Required`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .alert-box { background: #fef2f2; border: 2px solid ${urgencyColor}; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .amount-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .amount { font-size: 28px; font-weight: bold; color: #0a1628; }
            .cta-button { display: inline-block; background: #06b6d4; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <h2 style="text-align: center; color: ${urgencyColor};">Payment Failed</h2>
              
              <div class="alert-box">
                <p style="margin: 0; font-weight: 600; color: ${urgencyColor};">${urgencyText}</p>
              </div>
              
              <p>Dear ${details.companyName},</p>
              
              <p><strong>Reason:</strong> ${reasonDisplay}</p>
              
              <div class="amount-box">
                <p style="margin: 0 0 10px 0; color: #6b7280;">Amount Due</p>
                <p class="amount">${formatCurrency(details.amountDue)}</p>
              </div>
              
              ${details.nextRetryDate && !isLastAttempt ? `
              <p><strong>Next retry:</strong> ${details.nextRetryDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              ` : ''}
              
              ${isLastAttempt ? `
              <p style="color: #dc2626; font-weight: 600;">Your API access has been suspended. Assessment sessions cannot be created until payment is resolved.</p>
              ` : ''}
              
              <div style="text-align: center;">
                <a href="${details.updatePaymentUrl}" class="cta-button" style="color: white !important;">Update Payment Method</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                If you've already updated your payment method, we'll automatically retry on the next scheduled date.
                For immediate assistance, please contact our support team.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Billing failure notification sent to ${details.partnerEmail} (ID: ${result.messageId})`);
  }
  return { success: result.success };
}

export interface CardExpiryWarningDetails {
  partnerEmail: string;
  companyName: string;
  cardLast4: string;
  cardBrand: string;
  expiryMonth: number;
  expiryYear: number;
  daysUntilExpiry: number;
  updatePaymentUrl: string;
}

export async function sendCardExpiryWarning(details: CardExpiryWarningDetails): Promise<{ success: boolean }> {
  const urgencyText = details.daysUntilExpiry <= 1 
    ? 'Your card expires tomorrow!'
    : details.daysUntilExpiry <= 7 
      ? `Your card expires in ${details.daysUntilExpiry} days`
      : `Your card will expire in ${details.daysUntilExpiry} days`;
  
  const urgencyColor = details.daysUntilExpiry <= 1 ? '#dc2626' : details.daysUntilExpiry <= 7 ? '#f59e0b' : '#3b82f6';
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix Billing' },
    to: details.partnerEmail,
    subject: details.daysUntilExpiry <= 1 
      ? `URGENT: Card Expires Tomorrow - Update Required`
      : `Card Expiring Soon - Update Your Payment Method`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .alert-box { background: #fffbeb; border: 2px solid ${urgencyColor}; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
            .card-box { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; display: flex; align-items: center; justify-content: center; gap: 15px; }
            .card-icon { font-size: 24px; }
            .cta-button { display: inline-block; background: #06b6d4; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">HumanMetrix</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">AI Assessment Platform</p>
            </div>
            <div class="content">
              <div class="alert-box">
                <p style="margin: 0; font-weight: 600; color: ${urgencyColor}; font-size: 18px;">${urgencyText}</p>
              </div>
              
              <p>Dear ${details.companyName},</p>
              
              <p>Your payment card on file is about to expire:</p>
              
              <div class="card-box">
                <div>
                  <p style="margin: 0; font-weight: 600;">${details.cardBrand.charAt(0).toUpperCase() + details.cardBrand.slice(1)} ending in ${details.cardLast4}</p>
                  <p style="margin: 5px 0 0 0; color: #6b7280;">Expires: ${details.expiryMonth.toString().padStart(2, '0')}/${details.expiryYear}</p>
                </div>
              </div>
              
              <p>To avoid any interruption to your API access, please update your payment method before the expiry date.</p>
              
              <div style="text-align: center;">
                <a href="${details.updatePaymentUrl}" class="cta-button" style="color: white !important;">Update Payment Method</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">
                If your card expires without a replacement, we won't be able to process your billing and your API access may be suspended.
              </p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Card expiry warning sent to ${details.partnerEmail} (ID: ${result.messageId})`);
  }
  return { success: result.success };
}

export interface BillingFailureAdminDetails {
  partnerId: string;
  companyName: string;
  partnerEmail: string;
  failureReason: string;
  failedAttempts: number;
  amountDue: number;
  currency: string;
  billingType: string;
}

// Helper to get all super admin emails and send notifications
export async function notifySuperAdmins(details: {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  emailSubject: string;
  emailHtml: string;
}): Promise<{ emailSent: boolean; notificationCreated: boolean }> {
  let emailSent = false;
  let notificationCreated = false;
  
  // Create in-app notification first
  try {
    const { storage } = await import('./storage');
    await storage.broadcastAdminNotification({
      type: details.type,
      severity: details.severity,
      title: details.title,
      message: details.message,
      metadata: details.metadata,
      isRead: false,
    });
    notificationCreated = true;
    console.log(`[Admin Notification] Created in-app notification: ${details.title}`);
  } catch (error: any) {
    console.error(`[Admin Notification] Failed to create in-app notification:`, error.message);
  }
  
  // Send email to all super admins
  try {
    const { storage } = await import('./storage');
    const superAdmins = await storage.getSuperAdminUsers();
    
    // Critical error recipients - always receive notifications regardless of database
    const CRITICAL_ERROR_RECIPIENTS = [
      'daena@humanmetrix.co.uk',
      'oskar@humanmetrix.co.uk',
    ];
    
    // Combine database super admins with hardcoded critical recipients
    const dbAdminEmails = superAdmins.map(u => u.email).filter(Boolean);
    const adminEmails = [...new Set([...CRITICAL_ERROR_RECIPIENTS, ...dbAdminEmails])];
    
    for (const adminEmail of adminEmails) {
      try {
        const result = await sendEmail({
          from: { email: fromEmail, name: 'HumanMetrix System' },
          to: adminEmail,
          subject: details.emailSubject,
          html: details.emailHtml,
        });
        if (result.success) {
          console.log(`[Email] Admin notification email sent to ${adminEmail}: ${details.emailSubject}`);
        }
      } catch (sendError: any) {
        console.error(`[Email] Failed to send admin notification to ${adminEmail}:`, sendError.message);
      }
    }
    emailSent = true;
  } catch (error: any) {
    console.error(`[Email] Failed to send admin notification emails:`, error.message);
  }
  
  return { emailSent, notificationCreated };
}

export async function sendBillingFailureAdminNotification(details: BillingFailureAdminDetails): Promise<{ success: boolean }> {
  const adminEmail = fromEmail; // Send to system admin
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  
  const isSuspended = details.failedAttempts >= 3;
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix System' },
    to: adminEmail,
    subject: isSuspended 
      ? `[ALERT] Partner API Suspended: ${details.companyName} - Billing Failure`
      : `[ALERT] Partner Billing Failed: ${details.companyName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
            .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
            .label { color: #6b7280; }
            .value { font-weight: 600; }
            .suspended-badge { background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
            .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">Partner Billing Alert</h2>
            </div>
            <div class="content">
              <div class="info-row">
                <span class="label">Partner</span>
                <span class="value">${details.companyName}</span>
              </div>
              <div class="info-row">
                <span class="label">Partner ID</span>
                <span class="value">${details.partnerId}</span>
              </div>
              <div class="info-row">
                <span class="label">Email</span>
                <span class="value">${details.partnerEmail}</span>
              </div>
              <div class="info-row">
                <span class="label">Billing Type</span>
                <span class="value">${details.billingType}</span>
              </div>
              <div class="info-row">
                <span class="label">Failure Reason</span>
                <span class="value">${details.failureReason}</span>
              </div>
              <div class="info-row">
                <span class="label">Failed Attempts</span>
                <span class="value">${details.failedAttempts}/3</span>
              </div>
              <div class="info-row">
                <span class="label">Amount Due</span>
                <span class="value">${formatCurrency(details.amountDue)}</span>
              </div>
              <div class="info-row">
                <span class="label">Status</span>
                <span class="value">${isSuspended ? '<span class="suspended-badge">API SUSPENDED</span>' : 'Will retry'}</span>
              </div>
            </div>
            <div class="footer">
              <p>Automated notification from HumanMetrix billing system</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Admin billing failure notification sent (ID: ${result.messageId})`);
    
    // Also create in-app notification
    try {
      const { storage } = await import('./storage');
      await storage.broadcastAdminNotification({
        type: 'b2b_billing_failure',
        severity: isSuspended ? 'critical' : 'warning',
        title: isSuspended ? `API Suspended: ${details.companyName}` : `Billing Failed: ${details.companyName}`,
        message: `Partner billing failed (${details.failedAttempts}/3 attempts). Reason: ${details.failureReason}. Amount: ${formatCurrency(details.amountDue)}`,
        metadata: {
          partnerId: details.partnerId,
          companyName: details.companyName,
          partnerEmail: details.partnerEmail,
          billingType: details.billingType,
          failureReason: details.failureReason,
          failedAttempts: details.failedAttempts,
          amountDue: details.amountDue,
          currency: details.currency,
          isSuspended,
        },
        isRead: false,
      });
    } catch (notifError: any) {
      console.error(`Failed to create admin in-app notification:`, notifError.message);
    }
  }
  
  return { success: result.success };
}

// B2C Payment Failure Notification
export interface B2CPaymentFailureDetails {
  userEmail: string;
  userName?: string;
  userId?: string;
  purchaseId?: string;
  assessmentType?: string;
  amountDue: number;
  currency: string;
  failureReason: string;
  stripeSessionId?: string;
}

export async function notifyB2CPaymentFailure(details: B2CPaymentFailureDetails): Promise<{ success: boolean }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">B2C Payment Failed</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Customer</span>
              <span class="value">${details.userName || 'Unknown'}</span>
            </div>
            <div class="info-row">
              <span class="label">Email</span>
              <span class="value">${details.userEmail}</span>
            </div>
            ${details.assessmentType ? `
            <div class="info-row">
              <span class="label">Assessment</span>
              <span class="value">${details.assessmentType}</span>
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Amount</span>
              <span class="value">${formatCurrency(details.amountDue)}</span>
            </div>
            <div class="info-row">
              <span class="label">Failure Reason</span>
              <span class="value">${details.failureReason}</span>
            </div>
            ${details.stripeSessionId ? `
            <div class="info-row">
              <span class="label">Stripe Session</span>
              <span class="value">${details.stripeSessionId.substring(0, 20)}...</span>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Automated notification from HumanMetrix payment system</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return notifySuperAdmins({
    type: 'b2c_payment_failure',
    severity: 'warning',
    title: `B2C Payment Failed: ${details.userEmail}`,
    message: `Payment of ${formatCurrency(details.amountDue)} failed for ${details.userEmail}. Reason: ${details.failureReason}`,
    metadata: details,
    emailSubject: `[ALERT] B2C Payment Failed: ${details.userEmail}`,
    emailHtml,
  }).then(result => ({ success: result.emailSent || result.notificationCreated }));
}

// B2B Test Taker Payment Failure Notification
export interface B2BTestTakerPaymentFailureDetails {
  candidateEmail: string;
  candidateName?: string;
  sessionId: string;
  assessmentType: string;
  partnerId: string;
  partnerName: string;
  amountDue: number;
  currency: string;
  failureReason: string;
}

export async function notifyB2BTestTakerPaymentFailure(details: B2BTestTakerPaymentFailureDetails): Promise<{ success: boolean }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">B2B Test Taker Payment Failed</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Candidate</span>
              <span class="value">${details.candidateName || details.candidateEmail}</span>
            </div>
            <div class="info-row">
              <span class="label">Email</span>
              <span class="value">${details.candidateEmail}</span>
            </div>
            <div class="info-row">
              <span class="label">Assessment</span>
              <span class="value">${details.assessmentType}</span>
            </div>
            <div class="info-row">
              <span class="label">Partner</span>
              <span class="value">${details.partnerName}</span>
            </div>
            <div class="info-row">
              <span class="label">Amount</span>
              <span class="value">${formatCurrency(details.amountDue)}</span>
            </div>
            <div class="info-row">
              <span class="label">Failure Reason</span>
              <span class="value">${details.failureReason}</span>
            </div>
            <div class="info-row">
              <span class="label">Session ID</span>
              <span class="value">${details.sessionId.substring(0, 20)}...</span>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from HumanMetrix payment system</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return notifySuperAdmins({
    type: 'b2b_testtaker_payment_failure',
    severity: 'warning',
    title: `B2B Results Payment Failed: ${details.candidateEmail}`,
    message: `Results payment of ${formatCurrency(details.amountDue)} failed for ${details.candidateEmail} (${details.partnerName}). Reason: ${details.failureReason}`,
    metadata: details,
    emailSubject: `[ALERT] B2B Test Taker Payment Failed: ${details.candidateEmail}`,
    emailHtml,
  }).then(result => ({ success: result.emailSent || result.notificationCreated }));
}

// B2B Invoice Overdue Notification
export interface B2BInvoiceOverdueDetails {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  dueDate: Date;
  daysOverdue: number;
  suspensionWarning?: string; // Optional warning about upcoming suspension
}

export async function notifyB2BInvoiceOverdue(details: B2BInvoiceOverdueDetails): Promise<{ success: boolean }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  const severity = details.daysOverdue >= 30 ? 'critical' : details.daysOverdue >= 14 ? 'warning' : 'info';
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .overdue-badge { background: #fee2e2; color: #dc2626; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
          .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Invoice Overdue</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Partner</span>
              <span class="value">${details.partnerName}</span>
            </div>
            <div class="info-row">
              <span class="label">Invoice Number</span>
              <span class="value">${details.invoiceNumber}</span>
            </div>
            <div class="info-row">
              <span class="label">Amount Due</span>
              <span class="value">${formatCurrency(details.amountDue)}</span>
            </div>
            <div class="info-row">
              <span class="label">Due Date</span>
              <span class="value">${formatDate(details.dueDate)}</span>
            </div>
            <div class="info-row">
              <span class="label">Days Overdue</span>
              <span class="value"><span class="overdue-badge">${details.daysOverdue} days</span></span>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from HumanMetrix billing system</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return notifySuperAdmins({
    type: 'b2b_invoice_overdue',
    severity,
    title: `Invoice Overdue: ${details.partnerName} (${details.daysOverdue} days)`,
    message: `Invoice ${details.invoiceNumber} for ${formatCurrency(details.amountDue)} is ${details.daysOverdue} days overdue.`,
    metadata: details,
    emailSubject: `[ALERT] Invoice Overdue: ${details.partnerName} - ${details.invoiceNumber}`,
    emailHtml,
  }).then(result => ({ success: result.emailSent || result.notificationCreated }));
}

// Invoice Suspension Notification - sent to partner when API is suspended due to overdue invoice
export interface InvoiceSuspensionDetails {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  dueDate: Date;
  daysOverdue: number;
  paymentUrl: string;
  customReason?: string; // Optional custom reason for manual suspension
}

export async function notifyInvoiceSuspension(details: InvoiceSuspensionDetails): Promise<{ success: boolean; messageId?: string }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Determine if this is a manual suspension (customReason provided or no real invoice)
  const isManualSuspension = !!details.customReason || details.invoiceNumber === 'N/A';
  const subject = isManualSuspension 
    ? 'URGENT: API Access Suspended' 
    : `URGENT: API Access Suspended - Invoice ${details.invoiceNumber} Overdue`;
  
  // Generate different email content for manual vs invoice-based suspension
  const alertMessage = isManualSuspension
    ? details.customReason || 'Your API access has been suspended due to outstanding payments. Please contact support or make payment to restore access.'
    : 'Due to the outstanding invoice below, your live API access has been suspended. Test API keys remain active for development purposes.';
  
  const restoreMessage = isManualSuspension
    ? 'Please contact us or resolve any outstanding payments to restore your API access.'
    : 'Please pay the outstanding invoice. Once payment is confirmed and marked as received, your production API keys will be reactivated immediately.';
  
  // Invoice details section - only shown for invoice-based suspension
  const invoiceDetailsHtml = isManualSuspension ? '' : `
              <div class="info-row">
                <span class="label">Invoice Number</span>
                <span class="value">${details.invoiceNumber}</span>
              </div>
              <div class="info-row">
                <span class="label">Amount Due</span>
                <span class="value">${formatCurrency(details.amountDue)}</span>
              </div>
              <div class="info-row">
                <span class="label">Original Due Date</span>
                <span class="value">${formatDate(details.dueDate)}</span>
              </div>
              <div class="info-row">
                <span class="label">Days Overdue</span>
                <span class="value"><span class="overdue-badge">${details.daysOverdue} days</span></span>
              </div>`;
  
  const invoiceDetailsText = isManualSuspension ? '' : `
Invoice Number: ${details.invoiceNumber}
Amount Due: ${formatCurrency(details.amountDue)}
Due Date: ${formatDate(details.dueDate)}
Days Overdue: ${details.daysOverdue}
`;
  
  const ctaButtonHtml = isManualSuspension ? `
              <div style="text-align: center;">
                <a href="${details.paymentUrl}" class="cta-button" style="color: white !important;">Go to Billing Dashboard</a>
              </div>` : `
              <div style="text-align: center;">
                <a href="${details.paymentUrl}" class="cta-button" style="color: white !important;">Pay Invoice Now</a>
              </div>`;
  
  const msg = {
    from: { email: fromEmail, name: 'HumanMetrix' },
    to: details.partnerEmail,
    subject,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .alert-box { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .alert-title { color: #dc2626; font-weight: 600; margin: 0 0 10px 0; }
            .info-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { color: #6b7280; }
            .value { font-weight: 600; color: #111827; }
            .overdue-badge { background: #dc2626; color: white; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
            .cta-button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .cta-button:hover { background: #0e7490; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
            .impact-list { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .impact-list h4 { margin: 0 0 12px 0; color: #374151; }
            .impact-list ul { margin: 0; padding-left: 20px; }
            .impact-list li { margin-bottom: 8px; color: #4b5563; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>API Access Suspended</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <p class="alert-title">Action Required: Your production API keys have been deactivated</p>
                <p style="margin: 0; color: #7f1d1d;">${alertMessage}</p>
              </div>
              
              <div class="info-row">
                <span class="label">Company</span>
                <span class="value">${details.partnerName}</span>
              </div>
              ${invoiceDetailsHtml}
              
              <div class="impact-list">
                <h4>Service Impact:</h4>
                <ul>
                  <li>Production (live) API keys are now inactive</li>
                  <li>New assessment sessions cannot be created via production API</li>
                  <li>Existing completed assessments and data remain accessible</li>
                  <li>Test API keys continue to work for development</li>
                </ul>
              </div>
              
              <p style="margin-top: 20px;"><strong>To restore API access:</strong> ${restoreMessage}</p>
              
              ${ctaButtonHtml}
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">If you have already made payment or believe this is an error, please contact us immediately at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a></p>
            </div>
            <div class="footer">
              <p>HumanMetrix Ltd | AI Assessment Platform</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
URGENT: API Access Suspended

Your production API keys have been suspended.

Company: ${details.partnerName}
${invoiceDetailsText}
REASON:
${alertMessage}

SERVICE IMPACT:
- Production (live) API keys are now inactive
- New assessment sessions cannot be created via production API
- Existing completed assessments and data remain accessible
- Test API keys continue to work for development

TO RESTORE ACCESS:
${restoreMessage}

${isManualSuspension ? 'Go to your billing dashboard: ' : 'Pay the outstanding invoice at: '}${details.paymentUrl}

If you have already made payment or believe this is an error, please contact us at hello@humanmetrix.co.uk

HumanMetrix Ltd | AI Assessment Platform
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Invoice suspension notification sent to ${details.partnerEmail} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Invoice Restoration Notification - sent to partner when API is restored
export interface InvoiceRestorationDetails {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  dashboardUrl: string;
}

export async function notifyInvoiceRestoration(details: InvoiceRestorationDetails): Promise<{ success: boolean; messageId?: string }> {
  const msg = {
    to: details.partnerEmail,
    subject: 'API Access Restored - HumanMetrix',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f9fafb; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0891b2 0%, #0e7490 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .success-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .success-title { color: #16a34a; font-weight: 600; margin: 0 0 10px 0; }
            .cta-button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>API Access Restored</h1>
            </div>
            <div class="content">
              <div class="success-box">
                <p class="success-title">Your production API keys are now active</p>
                <p style="margin: 0; color: #166534;">Thank you for resolving the outstanding payment. Your full API access has been restored.</p>
              </div>
              
              <p>Hi ${details.partnerName},</p>
              
              <p>We're pleased to confirm that your HumanMetrix API access has been fully restored. Your production API keys are now active and you can resume using the assessment platform.</p>
              
              <p><strong>What's restored:</strong></p>
              <ul>
                <li>Production (live) API keys are now active</li>
                <li>New assessment sessions can be created</li>
                <li>Full platform functionality is available</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${details.dashboardUrl}" class="cta-button" style="color: white !important;">Go to Dashboard</a>
              </div>
              
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">If you have any questions, please contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a></p>
            </div>
            <div class="footer">
              <p>HumanMetrix Ltd | AI Assessment Platform</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
API Access Restored

Hi ${details.partnerName},

We're pleased to confirm that your HumanMetrix API access has been fully restored.

Your production API keys are now active and you can resume using the assessment platform.

What's restored:
- Production (live) API keys are now active
- New assessment sessions can be created
- Full platform functionality is available

Go to your dashboard: ${details.dashboardUrl}

If you have any questions, please contact us at hello@humanmetrix.co.uk

HumanMetrix Ltd | AI Assessment Platform
    `.trim(),
  };
  
  const result = await sendEmail(msg);
  if (result.success) {
    console.log(`[Email] Invoice restoration notification sent to ${details.partnerEmail} (ID: ${result.messageId})`);
  }
  return { success: result.success, messageId: result.messageId };
}

// Low Prepaid Balance Warning
export interface PrepaidLowBalanceDetails {
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  currentBalance: number;
  currency: string;
  testsRemaining: number;
  rechargeUrl: string;
}

export async function notifyPrepaidLowBalance(details: PrepaidLowBalanceDetails): Promise<{ success: boolean }> {
  const currencySymbol = CURRENCY_SYMBOLS[details.currency.toLowerCase()] || details.currency.toUpperCase() + ' ';
  const formatCurrency = (amount: number) => `${currencySymbol}${(amount / 100).toFixed(2)}`;
  
  const isCritical = details.testsRemaining <= 5;
  const severity = isCritical ? 'critical' : 'warning';
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; }
          .value { font-weight: 600; }
          .low-badge { background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 4px; font-weight: 600; }
          .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Low Prepaid Balance</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">Partner</span>
              <span class="value">${details.partnerName}</span>
            </div>
            <div class="info-row">
              <span class="label">Current Balance</span>
              <span class="value">${formatCurrency(details.currentBalance)}</span>
            </div>
            <div class="info-row">
              <span class="label">Credits Remaining</span>
              <span class="value"><span class="low-badge">${details.testsRemaining} tests</span></span>
            </div>
          </div>
          <div class="footer">
            <p>Automated notification from HumanMetrix billing system</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  return notifySuperAdmins({
    type: 'prepaid_low_balance',
    severity,
    title: `Low Balance: ${details.partnerName} (${details.testsRemaining} tests)`,
    message: `Partner ${details.partnerName} has only ${details.testsRemaining} credits remaining. Balance: ${formatCurrency(details.currentBalance)}`,
    metadata: details,
    emailSubject: `[ALERT] Low Prepaid Balance: ${details.partnerName}`,
    emailHtml,
  }).then(result => ({ success: result.emailSent || result.notificationCreated }));
}

// ==========================================
// CRITICAL ERROR NOTIFICATION SYSTEM
// ==========================================
// Use this function to notify super admins whenever ANY error is caught in the app

export interface CriticalErrorDetails {
  source: string;           // Where the error occurred (e.g., "API /users", "Scoring Worker", "Email Service")
  error: Error | string;    // The actual error
  userId?: string;          // Associated user if applicable
  partnerId?: string;       // Associated partner if applicable
  sessionId?: string;       // Associated session if applicable
  requestPath?: string;     // API request path if applicable
  requestMethod?: string;   // HTTP method if applicable
  additionalContext?: Record<string, any>; // Any extra context
}

/**
 * Notify all super admins of a critical error via email and in-app notification.
 * Call this function whenever an error is caught that should be escalated to administrators.
 * 
 * @example
 * try {
 *   await someRiskyOperation();
 * } catch (error) {
 *   await notifyCriticalError({
 *     source: 'Payment Processing',
 *     error: error,
 *     userId: user.id,
 *     additionalContext: { orderId: order.id }
 *   });
 * }
 */
export async function notifyCriticalError(details: CriticalErrorDetails): Promise<{ success: boolean }> {
  const errorMessage = details.error instanceof Error ? details.error.message : String(details.error);
  const errorStack = details.error instanceof Error ? details.error.stack : undefined;
  const timestamp = new Date().toISOString();
  
  // Build context items for display
  const contextItems: { label: string; value: string }[] = [
    { label: 'Timestamp', value: timestamp },
    { label: 'Source', value: details.source },
  ];
  
  if (details.requestMethod && details.requestPath) {
    contextItems.push({ label: 'Request', value: `${details.requestMethod} ${details.requestPath}` });
  }
  if (details.userId) {
    contextItems.push({ label: 'User ID', value: details.userId });
  }
  if (details.partnerId) {
    contextItems.push({ label: 'Partner ID', value: details.partnerId });
  }
  if (details.sessionId) {
    contextItems.push({ label: 'Session ID', value: details.sessionId });
  }
  
  // Add any additional context
  if (details.additionalContext) {
    for (const [key, value] of Object.entries(details.additionalContext)) {
      if (value !== undefined && value !== null) {
        contextItems.push({ label: key, value: String(value) });
      }
    }
  }
  
  const contextHtml = contextItems.map(item => `
    <div class="info-row">
      <span class="label">${item.label}</span>
      <span class="value">${item.value}</span>
    </div>
  `).join('');
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 20px; border: 1px solid #e5e7eb; border-top: none; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .label { color: #6b7280; min-width: 120px; }
          .value { font-weight: 500; word-break: break-word; text-align: right; }
          .error-message { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 15px 0; }
          .error-message pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 13px; color: #991b1b; }
          .stack-trace { background: #1f2937; color: #f3f4f6; border-radius: 6px; padding: 15px; margin: 15px 0; font-size: 12px; overflow-x: auto; }
          .stack-trace pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
          .footer { text-align: center; padding: 15px; color: #6b7280; font-size: 12px; }
          .critical-badge { background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;"><span class="critical-badge">CRITICAL</span> System Error Alert</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">An error occurred in ${details.source}</p>
          </div>
          <div class="content">
            ${contextHtml}
            
            <div class="error-message">
              <strong>Error Message:</strong>
              <pre>${errorMessage}</pre>
            </div>
            
            ${errorStack ? `
            <div class="stack-trace">
              <strong style="color: #9ca3af;">Stack Trace:</strong>
              <pre>${errorStack}</pre>
            </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Automated critical error notification from HumanMetrix</p>
          </div>
        </div>
      </body>
    </html>
  `;
  
  try {
    const result = await notifySuperAdmins({
      type: 'system_error',
      severity: 'critical',
      title: `Error in ${details.source}`,
      message: errorMessage,
      metadata: {
        source: details.source,
        errorMessage,
        errorStack,
        userId: details.userId,
        partnerId: details.partnerId,
        sessionId: details.sessionId,
        requestPath: details.requestPath,
        requestMethod: details.requestMethod,
        ...details.additionalContext,
        timestamp,
      },
      emailSubject: `[CRITICAL] System Error: ${details.source}`,
      emailHtml,
    });
    
    console.log(`[Critical Error] Notification sent for error in ${details.source}`);
    return { success: result.emailSent || result.notificationCreated };
  } catch (notifyError: any) {
    // Last resort: log to console if notification system itself fails
    console.error(`[Critical Error] Failed to send notification:`, notifyError.message);
    console.error(`[Critical Error] Original error in ${details.source}:`, errorMessage);
    return { success: false };
  }
}

// Broadcast email function for mass messaging
export async function sendBroadcastEmail(recipientEmail: string, title: string, content: string): Promise<{ success: boolean }> {
  try {
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 24px;">${title}</h1>
            </div>
            <div class="content">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <div class="footer">
              <p>This is an announcement from HumanMetrix</p>
              <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
    
    await sendEmail({
      to: recipientEmail,
      subject: title,
      html: emailHtml,
      text: `${title}\n\n${content}\n\n---\nThis is an announcement from HumanMetrix.`,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error(`Failed to send broadcast email to ${recipientEmail}:`, error.message);
    return { success: false };
  }
}

export async function sendBugReportNotificationEmail(details: {
  bugId: string;
  title: string;
  description: string;
  severity: string;
  reporterName: string;
  reporterEmail: string;
}): Promise<{ success: boolean }> {
  const { bugId, title, description, severity, reporterName, reporterEmail } = details;
  
  const severityColors: Record<string, string> = {
    critical: '#dc2626',
    high: '#ea580c',
    medium: '#d97706',
    low: '#2563eb',
  };
  
  const severityColor = severityColors[severity] || '#6b7280';
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0a1628 0%, #1a2744 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .field { margin-bottom: 16px; }
          .label { font-weight: 600; color: #374151; margin-bottom: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
          .value { color: #1f2937; }
          .severity-badge { display: inline-block; color: white; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
          .description-box { background: #f9fafb; border-left: 4px solid ${severityColor}; padding: 15px; margin: 16px 0; white-space: pre-wrap; }
          .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px;">New Bug Report</h1>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">HumanMetrix Platform</p>
          </div>
          <div class="content">
            <div style="margin-bottom: 20px;">
              <span class="severity-badge" style="background: ${severityColor};">${severity.toUpperCase()} SEVERITY</span>
            </div>
            
            <div class="field">
              <div class="label">Bug Title</div>
              <div class="value" style="font-size: 18px; font-weight: 600;">${title}</div>
            </div>
            
            <div class="field">
              <div class="label">Description</div>
              <div class="description-box">${description.replace(/\n/g, '<br>')}</div>
            </div>
            
            <div class="field">
              <div class="label">Reported By</div>
              <div class="value">${reporterName} (<a href="mailto:${reporterEmail}" style="color: #06b6d4;">${reporterEmail}</a>)</div>
            </div>
            
            <div class="field">
              <div class="label">Report ID</div>
              <div class="value" style="font-family: monospace; font-size: 13px; color: #6b7280;">${bugId}</div>
            </div>
            
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 13px; margin: 0;">A screenshot has been attached to this report. View the full details in the Admin Dashboard under Bug Reports.</p>
            </div>
          </div>
          <div class="footer">
            <p style="margin: 0;">HumanMetrix &mdash; AI Assessment Platform</p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const recipients = ['daena@humanmetrix.co.uk', 'oskar@humanmetrix.co.uk'];
    
    await sendEmail({
      to: recipients,
      subject: `[${severity.toUpperCase()}] Bug Report: ${title}`,
      html: emailHtml,
      text: `New Bug Report\n\nSeverity: ${severity.toUpperCase()}\nTitle: ${title}\nDescription: ${description}\nReported by: ${reporterName} (${reporterEmail})\nReport ID: ${bugId}\n\nView details in the Admin Dashboard.`,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('[Bug Report] Failed to send notification email:', error.message);
    return { success: false };
  }
}
