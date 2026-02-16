import { emailQueue } from './jobQueue';
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import type { Invitation } from '@shared/schema';

let sendGridInitialized = false;
let fromEmail = '';

function formatAssessmentName(type: string): string {
  const names: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment'
  };
  return names[type] || type;
}

// WARNING: Never cache the SendGrid client - access tokens expire.
// Always fetch fresh credentials before each send.
async function getSendGridClient() {
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
  
  sgMail.setApiKey(connectionSettings.settings.api_key);
  return { client: sgMail, fromEmail: connectionSettings.settings.from_email };
}

function getGmailTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!gmailUser || !gmailPass) return null;
  
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });
}

async function sendViaGmail(to: string, subject: string, html: string, text: string, replyTo?: string): Promise<any> {
  const transporter = getGmailTransporter();
  if (!transporter) throw new Error('Gmail not configured for fallback');
  
  const gmailUser = process.env.GMAIL_USER!;
  const result = await transporter.sendMail({
    from: `"HumanMetrix" <${gmailUser}>`,
    to,
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  });
  console.log(`[Gmail Worker Fallback] Email sent to ${to}`);
  return { messageId: result.messageId };
}

interface EmailJobData {
  type: 'invitation' | 'password_reset' | 'welcome' | 'receipt' | 'contact';
  payload: any;
}

export async function handleEmailJob(data: EmailJobData): Promise<any> {
  await new Promise(resolve => setTimeout(resolve, 200));

  try {
    const { client } = await getSendGridClient();
    
    switch (data.type) {
      case 'invitation':
        return await sendInvitationEmailSync(client, data.payload);
      case 'password_reset':
        return await sendPasswordResetEmailSync(client, data.payload);
      case 'welcome':
        return await sendWelcomeEmailSync(client, data.payload);
      case 'receipt':
        return await sendReceiptEmailSync(client, data.payload);
      case 'contact':
        return await sendContactEmailSync(client, data.payload);
      default:
        throw new Error(`Unknown email type: ${data.type}`);
    }
  } catch (sendGridError: any) {
    console.warn(`[Email Worker] SendGrid failed: ${sendGridError.message}. Trying Gmail fallback...`);
    sendGridInitialized = false;
    
    return await handleEmailJobViaGmail(data);
  }
}

async function handleEmailJobViaGmail(data: EmailJobData): Promise<any> {
  const baseUrl = getBaseUrl();
  
  switch (data.type) {
    case 'invitation': {
      const { invitation, inviterName } = data.payload;
      const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
      const assessmentListHtml = formattedAssessments.map((a: string) => `<li>${a}</li>`).join('');
      const inviteUrl = `${baseUrl}/invite/${invitation.token}`;
      return sendViaGmail(
        invitation.candidateEmail,
        `Assessment Invitation from ${inviterName}`,
        buildInvitationHtml(invitation, inviterName, assessmentListHtml, inviteUrl),
        buildInvitationText(invitation, inviterName, formattedAssessments.join(', '), inviteUrl),
      );
    }
    case 'password_reset': {
      const { email, name, resetToken } = data.payload;
      const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
      return sendViaGmail(email, 'Reset Your Password - HumanMetrix', buildPasswordResetHtml(name, resetUrl), buildPasswordResetText(name, resetUrl));
    }
    case 'welcome': {
      const { email, name, temporaryPassword, note, context = 'invitation', autoLoginToken } = data.payload;
      const loginUrl = autoLoginToken 
        ? `${baseUrl}/auto-login/${autoLoginToken}` 
        : `${baseUrl}/login`;
      const subject = context === 'post_payment' ? 'Your Account Credentials - HumanMetrix' : 'Your Assessment Invitation - HumanMetrix';
      return sendViaGmail(email, subject, buildWelcomeHtml(name, email, temporaryPassword, loginUrl, note), buildWelcomeText(name, email, temporaryPassword, loginUrl, note));
    }
    case 'receipt': {
      const { email, name, assessments, totalAmount, sessionId, currency = 'gbp' } = data.payload;
      const formattedAssessments = assessments.map(formatAssessmentName);
      const assessmentListHtml = formattedAssessments.map((a: string) => `<li>${a}</li>`).join('');
      const amountFormatted = formatCurrencyAmount(totalAmount, currency);
      return sendViaGmail(email, 'Payment Receipt - HumanMetrix', buildReceiptHtml(name, assessmentListHtml, amountFormatted, sessionId), buildReceiptText(name, formattedAssessments.join(', '), amountFormatted, sessionId));
    }
    case 'contact': {
      const { name, email, company, message, intent } = data.payload;
      const intentLabel = intent === 'demo' ? 'Demo Request' : 'Sales Inquiry';
      const salesEmail = 'hello@humanmetrix.co.uk';
      return sendViaGmail(salesEmail, `${intentLabel} from ${name} - ${company}`, buildContactHtml(name, email, company, message, intentLabel), buildContactText(name, email, company, message, intentLabel));
    }
    default:
      throw new Error(`Unknown email type: ${data.type}`);
  }
}

function getBaseUrl(): string {
  if (process.env.PRODUCTION_URL) {
    return process.env.PRODUCTION_URL.replace(/\/$/, '');
  }
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  return domain ? `https://${domain}` : 'http://localhost:5000';
}

async function sendInvitationEmailSync(client: typeof sgMail, payload: { invitation: Invitation; inviterName: string }) {
  const { invitation, inviterName } = payload;
  const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const baseUrl = getBaseUrl();
  const inviteUrl = `${baseUrl}/invite/${invitation.token}`;
  
  const msg = {
    to: invitation.candidateEmail,
    from: { email: fromEmail, name: 'HumanMetrix' },
    subject: `Assessment Invitation from ${inviterName}`,
    html: buildInvitationHtml(invitation, inviterName, assessmentListHtml, inviteUrl),
    text: buildInvitationText(invitation, inviterName, formattedAssessments.join(', '), inviteUrl),
  };

  const [response] = await client.send(msg);
  console.log(`[SendGrid Worker] Invitation email sent to ${invitation.candidateEmail}`);
  return { messageId: response.headers['x-message-id'] };
}

async function sendPasswordResetEmailSync(client: typeof sgMail, payload: { email: string; name: string; resetToken: string }) {
  const { email, name, resetToken } = payload;
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  
  const msg = {
    to: email,
    from: { email: fromEmail, name: 'HumanMetrix' },
    subject: 'Reset Your Password - HumanMetrix',
    html: buildPasswordResetHtml(name, resetUrl),
    text: buildPasswordResetText(name, resetUrl),
  };

  const [response] = await client.send(msg);
  console.log(`[SendGrid Worker] Password reset email sent to ${email}`);
  return { messageId: response.headers['x-message-id'] };
}

async function sendWelcomeEmailSync(client: typeof sgMail, payload: { email: string; name: string; temporaryPassword: string; note?: string; context?: 'invitation' | 'post_payment'; autoLoginToken?: string }) {
  const { email, name, temporaryPassword, note, context = 'invitation', autoLoginToken } = payload;
  const baseUrl = getBaseUrl();
  const loginUrl = autoLoginToken 
    ? `${baseUrl}/auto-login/${autoLoginToken}` 
    : `${baseUrl}/login`;
  
  const subject = context === 'post_payment' 
    ? 'Your Account Credentials - HumanMetrix'
    : 'Your Assessment Invitation - HumanMetrix';
  
  const msg = {
    to: email,
    from: { email: fromEmail, name: 'HumanMetrix' },
    subject,
    html: buildWelcomeHtml(name, email, temporaryPassword, loginUrl, note),
    text: buildWelcomeText(name, email, temporaryPassword, loginUrl, note),
  };

  const [response] = await client.send(msg);
  console.log(`[SendGrid Worker] Welcome email sent to ${email}`);
  return { messageId: response.headers['x-message-id'] };
}

function formatCurrencyAmount(amountInCents: number, currency: string): string {
  const currencySymbols: Record<string, string> = {
    'gbp': '£', 'usd': '$', 'eur': '€', 'aud': 'A$', 'cad': 'C$', 'nzd': 'NZ$',
    'sgd': 'S$', 'hkd': 'HK$', 'jpy': '¥', 'cny': '¥', 'inr': '₹', 'php': '₱',
    'vnd': '₫', 'idr': 'Rp', 'myr': 'RM', 'thb': '฿', 'krw': '₩', 'zar': 'R',
    'brl': 'R$', 'mxn': 'MX$', 'chf': 'CHF ', 'sek': 'kr', 'nok': 'kr', 'dkk': 'kr', 'pln': 'zł',
  };
  const symbol = currencySymbols[currency.toLowerCase()] || currency.toUpperCase() + ' ';
  return `${symbol}${(amountInCents / 100).toFixed(2)}`;
}

async function sendReceiptEmailSync(client: typeof sgMail, payload: { email: string; name: string; assessments: string[]; totalAmount: number; sessionId: string; currency?: string }) {
  const { email, name, assessments, totalAmount, sessionId, currency = 'gbp' } = payload;
  const formattedAssessments = assessments.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const amountFormatted = formatCurrencyAmount(totalAmount, currency);
  
  const msg = {
    to: email,
    from: { email: fromEmail, name: 'HumanMetrix' },
    subject: 'Payment Receipt - HumanMetrix',
    html: buildReceiptHtml(name, assessmentListHtml, amountFormatted, sessionId),
    text: buildReceiptText(name, formattedAssessments.join(', '), amountFormatted, sessionId),
  };

  const [response] = await client.send(msg);
  console.log(`[SendGrid Worker] Receipt email sent to ${email}`);
  return { messageId: response.headers['x-message-id'] };
}

async function sendContactEmailSync(client: typeof sgMail, payload: { name: string; email: string; company: string; message: string; intent: 'demo' | 'sales' }) {
  const { name, email, company, message, intent } = payload;
  const intentLabel = intent === 'demo' ? 'Demo Request' : 'Sales Inquiry';
  const salesEmail = 'hello@humanmetrix.co.uk';

  const msg = {
    to: salesEmail,
    from: { email: fromEmail, name: 'HumanMetrix Contact Form' },
    replyTo: email,
    subject: `${intentLabel} from ${name} - ${company}`,
    html: buildContactHtml(name, email, company, message, intentLabel),
    text: buildContactText(name, email, company, message, intentLabel),
  };

  const [response] = await client.send(msg);
  console.log(`[SendGrid Worker] Contact form email sent to ${salesEmail} from ${email}`);
  return { messageId: response.headers['x-message-id'] };
}

export async function sendInvitationEmailAsync(invitation: Invitation, inviterName: string): Promise<string> {
  return emailQueue.enqueue('email', { type: 'invitation', payload: { invitation, inviterName } });
}

export async function sendPasswordResetEmailAsync(email: string, name: string, resetToken: string): Promise<string> {
  return emailQueue.enqueue('email', { type: 'password_reset', payload: { email, name, resetToken } });
}

export async function sendWelcomeEmailAsync(email: string, name: string, temporaryPassword: string, note?: string): Promise<string> {
  return emailQueue.enqueue('email', { type: 'welcome', payload: { email, name, temporaryPassword, note } });
}

export async function sendPaymentReceiptEmailAsync(email: string, name: string, assessments: string[], totalAmount: number, sessionId: string, currency: string = 'gbp'): Promise<string> {
  return emailQueue.enqueue('email', { type: 'receipt', payload: { email, name, assessments, totalAmount, sessionId, currency } });
}

export async function sendContactFormEmailAsync(name: string, email: string, company: string, message: string, intent: 'demo' | 'sales'): Promise<string> {
  return emailQueue.enqueue('email', { type: 'contact', payload: { name, email, company, message, intent } });
}

function buildInvitationHtml(invitation: Invitation, inviterName: string, assessmentListHtml: string, inviteUrl: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#667eea;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.assessments{background:#f9fafb;padding:15px;border-radius:6px;margin:15px 0}ul{padding-left:20px}li{margin:8px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Hello ${invitation.candidateName},</h2><p>${inviterName} has invited you to complete the following assessments:</p><div class="assessments"><strong>Assessments:</strong><ul style="margin:10px 0 0 0;">${assessmentListHtml}</ul></div>${invitation.message ? `<p style="background:#f3f4f6;padding:15px;border-left:4px solid #667eea;margin:20px 0;"><em>"${invitation.message}"</em></p>` : ''}<p>These assessments are designed to evaluate your AI readiness and capabilities. Click the button below to get started:</p><div style="text-align:center;"><a href="${inviteUrl}" class="button">Start Assessments</a></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildInvitationText(invitation: Invitation, inviterName: string, assessmentList: string, inviteUrl: string): string {
  return `Hello ${invitation.candidateName},\n\n${inviterName} has invited you to complete the following assessments on HumanMetrix:\n\nAssessments: ${assessmentList}\n\n${invitation.message ? `Message: "${invitation.message}"\n\n` : ''}Click the link below to get started:\n${inviteUrl}\n\nThis invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB')}.\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildPasswordResetHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#06b6d4;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.warning{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Password Reset Request</h2><p>Hello ${name},</p><p>We received a request to reset your password. Click the button below to choose a new password:</p><div style="text-align:center;"><a href="${resetUrl}" class="button">Reset Password</a></div><div class="warning"><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</div><p style="color:#6b7280;font-size:14px;margin-top:30px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color:#06b6d4;">${resetUrl}</a></p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildPasswordResetText(name: string, resetUrl: string): string {
  return `Password Reset Request\n\nHello ${name},\n\nWe received a request to reset your password for your HumanMetrix account.\n\nClick the link below to reset your password:\n${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildWelcomeHtml(name: string, email: string, temporaryPassword: string, loginUrl: string, note?: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#06b6d4;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.credentials{background:#f0f9ff;border:2px solid #06b6d4;padding:20px;border-radius:6px;margin:20px 0}.password-box{background:#0a1628;color:#06b6d4;padding:15px;border-radius:6px;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;text-align:center;margin:10px 0;letter-spacing:2px}.note-box{background:#f3f4f6;padding:15px;border-left:4px solid #06b6d4;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">Welcome to HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Hello ${name},</h2><p>An account has been created for you on HumanMetrix. Use the following credentials to log in and complete your assessments:</p>${note ? `<div class="note-box"><em>"${note}"</em></div>` : ''}<div class="credentials"><p style="margin:0 0 10px 0;"><strong>Email:</strong> ${email}</p><p style="margin:0 0 10px 0;"><strong>Password:</strong></p><div class="password-box">${temporaryPassword}</div></div><div style="text-align:center;"><a href="${loginUrl}" class="button">Log In Now</a></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">If you need help, please contact hello@humanmetrix.co.uk</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildWelcomeText(name: string, email: string, temporaryPassword: string, loginUrl: string, note?: string): string {
  return `Welcome to HumanMetrix\n\nHello ${name},\n\nAn account has been created for you on HumanMetrix.\n\n${note ? `Note: "${note}"\n\n` : ''}Login Credentials:\nEmail: ${email}\nPassword: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildReceiptHtml(name: string, assessmentListHtml: string, amountFormatted: string, sessionId: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.receipt{background:#f9fafb;border:2px solid #e5e7eb;padding:20px;border-radius:6px;margin:20px 0}.total{background:#0a1628;color:#06b6d4;padding:15px;border-radius:6px;font-size:24px;font-weight:bold;text-align:center;margin:15px 0}.success-badge{background:#10b981;color:white;padding:8px 16px;border-radius:20px;display:inline-block;margin-bottom:20px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">Payment Successful</h1><p style="margin:10px 0 0 0;opacity:0.9;">HumanMetrix Receipt</p></div><div class="content"><div style="text-align:center;"><div class="success-badge">Payment Confirmed</div></div><h2>Hello ${name},</h2><p>Thank you for your purchase! Your payment has been successfully processed.</p><div class="receipt"><h3 style="margin-top:0;color:#374151;">Purchase Details</h3><p><strong>Results Unlocked:</strong></p><ul style="margin-left:20px;padding-left:0;list-style-position:inside;">${assessmentListHtml}</ul><div class="total">Total Paid: ${amountFormatted}</div><p style="color:#6b7280;font-size:14px;margin-top:15px;">Reference: ${sessionId.slice(-12).toUpperCase()}<br>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><h3>Next Steps:</h3><ol style="padding-left:20px;"><li>Log in to your HumanMetrix account</li><li>View your comprehensive results and download your PDF report</li></ol><p style="color:#6b7280;font-size:14px;margin-top:30px;">If you have any questions, please contact us at hello@humanmetrix.co.uk</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildReceiptText(name: string, assessmentList: string, amountFormatted: string, sessionId: string): string {
  return `Payment Successful - HumanMetrix Receipt\n\nHello ${name},\n\nThank you for your purchase! Your payment has been successfully processed.\n\nPURCHASE DETAILS:\nResults Unlocked: ${assessmentList}\nTotal Paid: ${amountFormatted}\nReference: ${sessionId.slice(-12).toUpperCase()}\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nNEXT STEPS:\n1. Log in to your HumanMetrix account\n2. View your comprehensive results and download your PDF report\n\nIf you have any questions, please contact us at hello@humanmetrix.co.uk\n\n© ${new Date().getFullYear()} HumanMetrix\nThis is an automated receipt for your records.`;
}

function buildContactHtml(name: string, email: string, company: string, message: string, intentLabel: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.field{margin-bottom:20px}.label{font-weight:600;color:#374151;margin-bottom:5px}.value{color:#1f2937}.message-box{background:#f9fafb;border-left:4px solid #06b6d4;padding:15px;margin:20px 0}.badge{display:inline-block;background:#06b6d4;color:white;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:20px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">New ${intentLabel}</h1><p style="margin:10px 0 0 0;opacity:0.9;">HumanMetrix Contact Form</p></div><div class="content"><div class="badge">${intentLabel.toUpperCase()}</div><div class="field"><div class="label">Name:</div><div class="value">${name}</div></div><div class="field"><div class="label">Email:</div><div class="value"><a href="mailto:${email}" style="color:#06b6d4;text-decoration:none;">${email}</a></div></div><div class="field"><div class="label">Company:</div><div class="value">${company}</div></div><div class="field"><div class="label">Message:</div><div class="message-box">${message.replace(/\n/g, '<br>')}</div></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">Submitted on ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p></div><div class="footer"><p>&copy; ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p><p style="margin-top:10px;">Reply directly to this email to respond to ${name}</p></div></div></body></html>`;
}

function buildContactText(name: string, email: string, company: string, message: string, intentLabel: string): string {
  return `New ${intentLabel} - HumanMetrix\n\n${intentLabel}: ${intentLabel.toUpperCase()}\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\n\nMessage:\n${message}\n\nSubmitted on ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}\n\nReply directly to this email to respond to ${name}\n\n© ${new Date().getFullYear()} HumanMetrix`;
}
