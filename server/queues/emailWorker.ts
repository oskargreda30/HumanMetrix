import { emailQueue } from './jobQueue';
import nodemailer from 'nodemailer';
import type { Invitation } from '@shared/schema';

function formatAssessmentName(type: string): string {
  const names: Record<string, string> = {
    'fit': 'FIT Assessment',
    'ai_readiness': 'AI Readiness Assessment',
    'prompt_architecture': 'Prompt Architecture Assessment',
    'aiq': 'AIQ Assessment'
  };
  return names[type] || type;
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Email credentials not configured.');
    return null;
  }
  
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      rateLimit: 5,
    });
  }
  
  return transporter;
}

interface EmailJobData {
  type: 'invitation' | 'password_reset' | 'welcome' | 'receipt' | 'contact';
  payload: any;
}

export async function handleEmailJob(data: EmailJobData): Promise<any> {
  const emailTransporter = getTransporter();
  if (!emailTransporter) {
    throw new Error('Email transporter not configured');
  }

  await new Promise(resolve => setTimeout(resolve, 200));

  switch (data.type) {
    case 'invitation':
      return sendInvitationEmailSync(emailTransporter, data.payload);
    case 'password_reset':
      return sendPasswordResetEmailSync(emailTransporter, data.payload);
    case 'welcome':
      return sendWelcomeEmailSync(emailTransporter, data.payload);
    case 'receipt':
      return sendReceiptEmailSync(emailTransporter, data.payload);
    case 'contact':
      return sendContactEmailSync(emailTransporter, data.payload);
    default:
      throw new Error(`Unknown email type: ${data.type}`);
  }
}

async function sendInvitationEmailSync(emailTransporter: any, payload: { invitation: Invitation; inviterName: string }) {
  const { invitation, inviterName } = payload;
  const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const inviteUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/invite/${invitation.token}`;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: invitation.candidateEmail,
    subject: `Assessment Invitation from ${inviterName}`,
    html: buildInvitationHtml(invitation, inviterName, assessmentListHtml, inviteUrl),
    text: buildInvitationText(invitation, inviterName, formattedAssessments.join(', '), inviteUrl),
  };

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Invitation email sent to ${invitation.candidateEmail} (ID: ${info.messageId})`);
  return { messageId: info.messageId };
}

async function sendPasswordResetEmailSync(emailTransporter: any, payload: { email: string; name: string; resetToken: string }) {
  const { email, name, resetToken } = payload;
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
  const resetUrl = `https://${baseUrl}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - HumanMetrix',
    html: buildPasswordResetHtml(name, resetUrl),
    text: buildPasswordResetText(name, resetUrl),
  };

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to ${email} (ID: ${info.messageId})`);
  return { messageId: info.messageId };
}

async function sendWelcomeEmailSync(emailTransporter: any, payload: { email: string; name: string; temporaryPassword: string; note?: string }) {
  const { email, name, temporaryPassword, note } = payload;
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
  const loginUrl = `https://${baseUrl}/login`;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Assessment Invitation - HumanMetrix',
    html: buildWelcomeHtml(name, email, temporaryPassword, loginUrl, note),
    text: buildWelcomeText(name, email, temporaryPassword, loginUrl, note),
  };

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Welcome email sent to ${email} (ID: ${info.messageId})`);
  return { messageId: info.messageId };
}

// Format amount with currency symbol
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

async function sendReceiptEmailSync(emailTransporter: any, payload: { email: string; name: string; assessments: string[]; totalAmount: number; sessionId: string; currency?: string }) {
  const { email, name, assessments, totalAmount, sessionId, currency = 'gbp' } = payload;
  const formattedAssessments = assessments.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const amountFormatted = formatCurrencyAmount(totalAmount, currency);
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Payment Receipt - HumanMetrix',
    html: buildReceiptHtml(name, assessmentListHtml, amountFormatted, sessionId),
    text: buildReceiptText(name, formattedAssessments.join(', '), amountFormatted, sessionId),
  };

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Receipt email sent to ${email} (ID: ${info.messageId})`);
  return { messageId: info.messageId };
}

async function sendContactEmailSync(emailTransporter: any, payload: { name: string; email: string; company: string; message: string; intent: 'demo' | 'sales' }) {
  const { name, email, company, message, intent } = payload;
  const intentLabel = intent === 'demo' ? 'Demo Request' : 'Sales Inquiry';
  const salesEmail = 'hello@humanmetrix.co.uk';

  const mailOptions = {
    from: `"HumanMetrix Contact Form" <${process.env.GMAIL_USER}>`,
    to: salesEmail,
    replyTo: email,
    subject: `${intentLabel} from ${name} - ${company}`,
    html: buildContactHtml(name, email, company, message, intentLabel),
    text: buildContactText(name, email, company, message, intentLabel),
  };

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Contact form email sent to ${salesEmail} from ${email} (ID: ${info.messageId})`);
  return { messageId: info.messageId };
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
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#667eea;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.assessments{background:#f9fafb;padding:15px;border-radius:6px;margin:15px 0}ul{padding-left:20px}li{margin:8px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Hello ${invitation.candidateName},</h2><p>${inviterName} has invited you to complete the following assessments:</p><div class="assessments"><strong>Assessments:</strong><ul style="margin:10px 0 0 0;">${assessmentListHtml}</ul></div>${invitation.message ? `<p style="background:#f3f4f6;padding:15px;border-left:4px solid #667eea;margin:20px 0;"><em>"${invitation.message}"</em></p>` : ''}<p>These assessments are designed to evaluate your AI readiness and capabilities. Click the button below to get started:</p><div style="text-align:center;"><a href="${inviteUrl}" class="button">Start Assessments</a></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}.</p></div><div class="footer"><p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildInvitationText(invitation: Invitation, inviterName: string, assessmentList: string, inviteUrl: string): string {
  return `Hello ${invitation.candidateName},\n\n${inviterName} has invited you to complete the following assessments on HumanMetrix:\n\nAssessments: ${assessmentList}\n\n${invitation.message ? `Message: "${invitation.message}"\n\n` : ''}Click the link below to get started:\n${inviteUrl}\n\nThis invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString('en-GB')}.\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildPasswordResetHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#06b6d4;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.warning{background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Password Reset Request</h2><p>Hello ${name},</p><p>We received a request to reset your password. Click the button below to choose a new password:</p><div style="text-align:center;"><a href="${resetUrl}" class="button">Reset Password</a></div><div class="warning"><strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.</div><p style="color:#6b7280;font-size:14px;margin-top:30px;">If the button doesn't work, copy and paste this link into your browser:<br><a href="${resetUrl}" style="color:#06b6d4;">${resetUrl}</a></p></div><div class="footer"><p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildPasswordResetText(name: string, resetUrl: string): string {
  return `Password Reset Request\n\nHello ${name},\n\nWe received a request to reset your password for your HumanMetrix account.\n\nClick the link below to reset your password:\n${resetUrl}\n\n⚠️ This link will expire in 1 hour.\n\nIf you didn't request a password reset, please ignore this email.\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildWelcomeHtml(name: string, email: string, temporaryPassword: string, loginUrl: string, note?: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.button{display:inline-block;background:#06b6d4;color:white;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:600;margin:20px 0}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.credentials{background:#f0f9ff;border:2px solid #06b6d4;padding:20px;border-radius:6px;margin:20px 0}.password-box{background:#0a1628;color:#06b6d4;padding:15px;border-radius:6px;font-family:'Courier New',monospace;font-size:18px;font-weight:bold;text-align:center;margin:10px 0;letter-spacing:2px}.note-box{background:#f3f4f6;padding:15px;border-left:4px solid #06b6d4;margin:20px 0}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">Welcome to HumanMetrix</h1><p style="margin:10px 0 0 0;opacity:0.9;">AI Assessment Platform</p></div><div class="content"><h2>Hello ${name},</h2><p>An account has been created for you on HumanMetrix. Use the following credentials to log in and complete your assessments:</p>${note ? `<div class="note-box"><em>"${note}"</em></div>` : ''}<div class="credentials"><p style="margin:0 0 10px 0;"><strong>Email:</strong> ${email}</p><p style="margin:0 0 10px 0;"><strong>Password:</strong></p><div class="password-box">${temporaryPassword}</div></div><div style="text-align:center;"><a href="${loginUrl}" class="button">Log In Now</a></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">If you need help, please contact hello@humanmetrix.co.uk</p></div><div class="footer"><p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p></div></div></body></html>`;
}

function buildWelcomeText(name: string, email: string, temporaryPassword: string, loginUrl: string, note?: string): string {
  return `Welcome to HumanMetrix\n\nHello ${name},\n\nAn account has been created for you on HumanMetrix.\n\n${note ? `Note: "${note}"\n\n` : ''}Login Credentials:\nEmail: ${email}\nPassword: ${temporaryPassword}\n\nLog in at: ${loginUrl}\n\n© ${new Date().getFullYear()} HumanMetrix`;
}

function buildReceiptHtml(name: string, assessmentListHtml: string, amountFormatted: string, sessionId: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.receipt{background:#f9fafb;border:2px solid #e5e7eb;padding:20px;border-radius:6px;margin:20px 0}.total{background:#0a1628;color:#06b6d4;padding:15px;border-radius:6px;font-size:24px;font-weight:bold;text-align:center;margin:15px 0}.success-badge{background:#10b981;color:white;padding:8px 16px;border-radius:20px;display:inline-block;margin-bottom:20px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">Payment Successful</h1><p style="margin:10px 0 0 0;opacity:0.9;">HumanMetrix Receipt</p></div><div class="content"><div style="text-align:center;"><div class="success-badge">✓ Payment Confirmed</div></div><h2>Hello ${name},</h2><p>Thank you for your purchase! Your payment has been successfully processed.</p><div class="receipt"><h3 style="margin-top:0;color:#374151;">Purchase Details</h3><p><strong>Results Unlocked:</strong></p><ul style="margin-left:20px;padding-left:0;list-style-position:inside;">${assessmentListHtml}</ul><div class="total">Total Paid: ${amountFormatted}</div><p style="color:#6b7280;font-size:14px;margin-top:15px;">Reference: ${sessionId.slice(-12).toUpperCase()}<br>Date: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p></div><h3>Next Steps:</h3><ol style="padding-left:20px;"><li>Log in to your HumanMetrix account</li><li>View your comprehensive results and download your PDF report</li></ol><p style="color:#6b7280;font-size:14px;margin-top:30px;">If you have any questions, please contact us at hello@humanmetrix.co.uk</p></div><div class="footer"><p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p><p style="margin-top:10px;color:#9ca3af;">This is an automated receipt for your records.</p></div></div></body></html>`;
}

function buildReceiptText(name: string, assessmentList: string, amountFormatted: string, sessionId: string): string {
  return `Payment Successful - HumanMetrix Receipt\n\nHello ${name},\n\nThank you for your purchase! Your payment has been successfully processed.\n\nPURCHASE DETAILS:\nResults Unlocked: ${assessmentList}\nTotal Paid: ${amountFormatted}\nReference: ${sessionId.slice(-12).toUpperCase()}\nDate: ${new Date().toLocaleDateString('en-GB')}\n\nNEXT STEPS:\n1. Log in to your HumanMetrix account\n2. View your comprehensive results and download your PDF report\n\nIf you have any questions, please contact us at hello@humanmetrix.co.uk\n\n© ${new Date().getFullYear()} HumanMetrix\nThis is an automated receipt for your records.`;
}

function buildContactHtml(name: string, email: string, company: string, message: string, intentLabel: string): string {
  return `<!DOCTYPE html><html><head><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;line-height:1.6;color:#333}.container{max-width:600px;margin:0 auto;padding:20px}.header{background:linear-gradient(135deg,#0a1628 0%,#1a2744 100%);color:white;padding:30px;text-align:center;border-radius:8px 8px 0 0}.content{background:#fff;padding:30px;border:1px solid #e5e7eb;border-top:none}.footer{text-align:center;padding:20px;color:#6b7280;font-size:14px}.field{margin-bottom:20px}.label{font-weight:600;color:#374151;margin-bottom:5px}.value{color:#1f2937}.message-box{background:#f9fafb;border-left:4px solid #06b6d4;padding:15px;margin:20px 0}.badge{display:inline-block;background:#06b6d4;color:white;padding:6px 12px;border-radius:4px;font-size:12px;font-weight:600;margin-bottom:20px}</style></head><body><div class="container"><div class="header"><h1 style="margin:0;">New ${intentLabel}</h1><p style="margin:10px 0 0 0;opacity:0.9;">HumanMetrix Contact Form</p></div><div class="content"><div class="badge">${intentLabel.toUpperCase()}</div><div class="field"><div class="label">Name:</div><div class="value">${name}</div></div><div class="field"><div class="label">Email:</div><div class="value"><a href="mailto:${email}" style="color:#06b6d4;text-decoration:none;">${email}</a></div></div><div class="field"><div class="label">Company:</div><div class="value">${company}</div></div><div class="field"><div class="label">Message:</div><div class="message-box">${message.replace(/\n/g, '<br>')}</div></div><p style="color:#6b7280;font-size:14px;margin-top:30px;">Submitted on ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}</p></div><div class="footer"><p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p><p style="margin-top:10px;">Reply directly to this email to respond to ${name}</p></div></div></body></html>`;
}

function buildContactText(name: string, email: string, company: string, message: string, intentLabel: string): string {
  return `New ${intentLabel} - HumanMetrix\n\n${intentLabel}: ${intentLabel.toUpperCase()}\n\nName: ${name}\nEmail: ${email}\nCompany: ${company}\n\nMessage:\n${message}\n\nSubmitted on ${new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'})}\n\nReply directly to this email to respond to ${name}\n\n© ${new Date().getFullYear()} HumanMetrix`;
}
