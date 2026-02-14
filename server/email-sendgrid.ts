/**
 * SendGrid Email Module
 * 
 * This module provides the same interface as email.ts but uses SendGrid instead of Gmail.
 * It is configured via the Replit SendGrid connector.
 * 
 * TO SWITCH FROM GMAIL TO SENDGRID:
 * 1. In any file that imports from './email', change to import from './email-sendgrid'
 * 2. Or rename this file to email.ts and backup the original
 * 
 * Integration: SendGrid connector (connection:conn_sendgrid_01KFA2ZZQMDERTVRPFCWEEM1ET)
 */

import sgMail from '@sendgrid/mail';
import type { Invitation } from '@shared/schema';
import { generateReceiptPDF, generateInvoiceReceiptNumber, type ReceiptData } from './generateReceipt';

function formatAssessmentName(type: string): string {
  const names: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment'
  };
  return names[type] || type;
}

let sendGridInitialized = false;
let fromEmail: string = '';

async function getCredentials() {
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
    throw new Error('SendGrid not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, email: connectionSettings.settings.from_email };
}

async function getSendGridClient() {
  const { apiKey, email } = await getCredentials();
  sgMail.setApiKey(apiKey);
  fromEmail = email;
  sendGridInitialized = true;
  return { client: sgMail, fromEmail: email };
}

export async function initializeEmailSystem() {
  console.log('Initializing SendGrid email system...');
  try {
    await getSendGridClient();
    console.log('✅ SendGrid ready to send emails');
  } catch (error: any) {
    console.error('❌ SendGrid initialization failed:', error.message);
  }
}

export async function sendPartnerEmail(options: { to: string; subject: string; html: string; text?: string }): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const msg = {
      to: options.to,
      from: { email: fromEmail, name: 'HumanMetrix' },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };
    
    const [response] = await client.send(msg);
    console.log(`[SendGrid] Partner email sent to ${options.to}`);
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error: any) {
    console.error(`[SendGrid] Failed to send partner email:`, error.message);
    return { success: false };
  }
}

export async function sendInvitationEmail(invitation: Invitation, inviterName: string) {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
    const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
    const assessmentListText = formattedAssessments.join(', ');
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const inviteUrl = domain ? `https://${domain}/invite/${invitation.token}` : `http://localhost:5000/invite/${invitation.token}`;
    
    const msg = {
      to: invitation.candidateEmail,
      from: { email: fromEmail, name: 'HumanMetrix' },
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
                  <a href="${inviteUrl}" class="button">Start Assessments</a>
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
                <p>HumanMetrix ${new Date().getFullYear()}. All rights reserved.</p>
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
Click here to start: ${inviteUrl}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB', { 
  day: 'numeric', 
  month: 'long', 
  year: 'numeric' 
})}.

HumanMetrix ${new Date().getFullYear()}
      `,
    };
    
    await client.send(msg);
    console.log(`[SendGrid] Invitation email sent to ${invitation.candidateEmail}`);
  } catch (error: any) {
    console.error('[SendGrid] Failed to send invitation email:', error.message);
  }
}

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const resetUrl = domain ? `https://${domain}/reset-password/${resetToken}` : `http://localhost:5000/reset-password/${resetToken}`;
    
    const msg = {
      to: email,
      from: { email: fromEmail, name: 'HumanMetrix' },
      subject: 'Reset Your Password - HumanMetrix',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">HumanMetrix</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Password Reset</p>
              </div>
              <div class="content">
                <h2>Hello ${name},</h2>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>HumanMetrix ${new Date().getFullYear()}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${name},\n\nWe received a request to reset your password.\n\nClick here to reset: ${resetUrl}\n\nThis link expires in 1 hour.\n\nHumanMetrix`,
    };
    
    await client.send(msg);
    console.log(`[SendGrid] Password reset email sent to ${email}`);
  } catch (error: any) {
    console.error('[SendGrid] Failed to send password reset email:', error.message);
  }
}

export async function sendWelcomeEmailWithPassword(email: string, name: string, temporaryPassword: string, note?: string, autoLoginToken?: string) {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
    const baseUrl = domain ? `https://${domain}` : `http://localhost:5000`;
    const loginUrl = autoLoginToken 
      ? `${baseUrl}/auto-login/${autoLoginToken}` 
      : `${baseUrl}/login`;
    
    const msg = {
      to: email,
      from: { email: fromEmail, name: 'HumanMetrix' },
      subject: 'Welcome to HumanMetrix - Your Account Details',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .credentials { background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Welcome to HumanMetrix</h1>
              </div>
              <div class="content">
                <h2>Hello ${name},</h2>
                <p>Your HumanMetrix account has been created. Here are your login credentials:</p>
                
                <div class="credentials">
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
                </div>
                
                ${note ? `<p style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;"><strong>Note:</strong> ${note}</p>` : ''}
                
                <p>Please change your password after your first login for security.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" class="button">Log In Now</a>
                </div>
              </div>
              <div class="footer">
                <p>HumanMetrix ${new Date().getFullYear()}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Hello ${name},\n\nYour HumanMetrix account has been created.\n\nEmail: ${email}\nTemporary Password: ${temporaryPassword}\n\n${note ? `Note: ${note}\n\n` : ''}Please change your password after your first login.\n\nLog in at: ${loginUrl}\n\nHumanMetrix`,
    };
    
    await client.send(msg);
    console.log(`[SendGrid] Welcome email sent to ${email}`);
  } catch (error: any) {
    console.error('[SendGrid] Failed to send welcome email:', error.message);
  }
}

export async function sendEmailVerificationCode(
  email: string,
  code: string,
  name?: string
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const msg = {
      to: email,
      from: { email: fromEmail, name: 'HumanMetrix' },
      subject: `${code} - Your HumanMetrix Verification Code`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; text-align: center; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f9fafb; padding: 20px 30px; border-radius: 8px; margin: 20px 0; display: inline-block; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">HumanMetrix</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
              </div>
              <div class="content">
                <h2>Hello${name ? ` ${name}` : ''},</h2>
                <p>Your verification code is:</p>
                <div class="code">${code}</div>
                <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                  This code expires in 10 minutes. If you didn't request this code, please ignore this email.
                </p>
              </div>
              <div class="footer">
                <p>HumanMetrix ${new Date().getFullYear()}. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
      text: `Your HumanMetrix verification code is: ${code}\n\nThis code expires in 10 minutes.\n\nHumanMetrix`,
    };
    
    const [response] = await client.send(msg);
    console.log(`[SendGrid] Verification code sent to ${email}`);
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error: any) {
    console.error('[SendGrid] Failed to send verification code:', error.message);
    return { success: false };
  }
}

export async function notifyCriticalError(details: {
  errorType: string;
  errorMessage: string;
  source: string;
  context?: Record<string, any>;
  stackTrace?: string;
}): Promise<{ success: boolean }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (superAdminEmails.length === 0) {
      console.log('[SendGrid] No super admin emails configured for critical error notification');
      return { success: false };
    }
    
    const msg = {
      to: superAdminEmails,
      from: { email: fromEmail, name: 'HumanMetrix System' },
      subject: `[CRITICAL] ${details.errorType} - ${details.source}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
              .error-box { background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .stack { background: #1f2937; color: #f3f4f6; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 12px; overflow-x: auto; white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">Critical Error Alert</h1>
              </div>
              <div class="content">
                <p><strong>Source:</strong> ${details.source}</p>
                <p><strong>Type:</strong> ${details.errorType}</p>
                <p><strong>Time:</strong> ${new Date().toISOString()}</p>
                
                <div class="error-box">
                  <strong>Error Message:</strong>
                  <p>${details.errorMessage}</p>
                </div>
                
                ${details.context ? `<p><strong>Context:</strong></p><pre style="background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(details.context, null, 2)}</pre>` : ''}
                
                ${details.stackTrace ? `<p><strong>Stack Trace:</strong></p><div class="stack">${details.stackTrace}</div>` : ''}
              </div>
            </div>
          </body>
        </html>
      `,
      text: `CRITICAL ERROR\n\nSource: ${details.source}\nType: ${details.errorType}\nTime: ${new Date().toISOString()}\n\nMessage: ${details.errorMessage}\n\n${details.stackTrace || ''}`,
    };
    
    await client.send(msg);
    console.log(`[SendGrid] Critical error notification sent`);
    return { success: true };
  } catch (error: any) {
    console.error('[SendGrid] Failed to send critical error notification:', error.message);
    return { success: false };
  }
}

export async function notifySuperAdmins(details: {
  subject: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  context?: Record<string, any>;
}): Promise<{ success: boolean }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (superAdminEmails.length === 0) {
      console.log('[SendGrid] No super admin emails configured');
      return { success: false };
    }
    
    const priorityColors: Record<string, string> = {
      low: '#22c55e',
      medium: '#eab308',
      high: '#f97316',
      critical: '#dc2626',
    };
    
    const priority = details.priority || 'medium';
    const color = priorityColors[priority];
    
    const msg = {
      to: superAdminEmails,
      from: { email: fromEmail, name: 'HumanMetrix System' },
      subject: `[${priority.toUpperCase()}] ${details.subject}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0;">${details.subject}</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Priority: ${priority.toUpperCase()}</p>
              </div>
              <div class="content">
                <p>${details.message}</p>
                ${details.context ? `<pre style="background: #f9fafb; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(details.context, null, 2)}</pre>` : ''}
              </div>
            </div>
          </body>
        </html>
      `,
      text: `[${priority.toUpperCase()}] ${details.subject}\n\n${details.message}`,
    };
    
    await client.send(msg);
    console.log(`[SendGrid] Super admin notification sent: ${details.subject}`);
    return { success: true };
  } catch (error: any) {
    console.error('[SendGrid] Failed to send super admin notification:', error.message);
    return { success: false };
  }
}

/**
 * Generic email sending function for SendGrid
 * This can be used as a drop-in replacement for any email sending needs
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition?: 'attachment' | 'inline';
  }>;
}): Promise<{ success: boolean; messageId?: string }> {
  try {
    const { client, fromEmail } = await getSendGridClient();
    
    const msg: any = {
      to: options.to,
      from: { email: fromEmail, name: 'HumanMetrix' },
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    };
    
    if (options.attachments && options.attachments.length > 0) {
      msg.attachments = options.attachments;
    }
    
    const [response] = await client.send(msg);
    console.log(`[SendGrid] Email sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    return { success: true, messageId: response.headers['x-message-id'] };
  } catch (error: any) {
    console.error(`[SendGrid] Failed to send email:`, error.message);
    return { success: false };
  }
}

/**
 * NOTE: Additional email functions from email.ts can be migrated here as needed.
 * 
 * The following functions exist in email.ts and should be migrated when switching:
 * - sendContactFormEmail
 * - sendPaymentReceiptEmail
 * - sendPaymentReceiptWithPdf
 * - sendPartnerQuotaWarning70
 * - sendPartnerQuotaWarning90
 * - sendPartnerAccessSuspendedEmail
 * - sendPartnerSecurityAlert
 * - sendPartnerMonthlySummary
 * - sendPartnerAutoTopUpConfirmation
 * - sendPartnerInvoiceEmail
 * - sendPartnerWelcomeEmail
 * - sendGeneralEnquiryEmail
 * - sendPartnerBulkInvitationEmail
 * - sendB2BCongratulatoryEmail
 * - sendB2BAllCompleteEmail
 * - sendB2BResultsEmail
 * - sendPartnerTeamInvitationEmail
 * - sendPartnerTeamCredentialsEmail
 * - sendB2BResultsUnlockedEmail
 * - sendBillingFailureNotification
 * - sendCardExpiryWarning
 * - sendBillingFailureAdminNotification
 * - notifyB2CPaymentFailure
 * - notifyB2BTestTakerPaymentFailure
 * - notifyB2BInvoiceOverdue
 * - notifyInvoiceSuspension
 * - notifyInvoiceRestoration
 * - notifyPrepaidLowBalance
 * 
 * When ready to fully migrate, these functions should be copied from email.ts
 * and adapted to use the getSendGridClient() function instead of getTransporter().
 */
