import nodemailer from 'nodemailer';
import type { Invitation } from '@shared/schema';

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

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;
let transporterVerified = false;

function getTransporter() {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error('❌ Email credentials not configured. GMAIL_USER and GMAIL_APP_PASSWORD required.');
    return null;
  }
  
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      requireTLS: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
      pool: true, // use pooled connections for better performance
      maxConnections: 5,
      maxMessages: 100,
      debug: process.env.NODE_ENV === 'development', // show SMTP traffic in dev
      logger: true, // log to console
    });

    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP Connection Error:', error);
        transporterVerified = false;
      } else {
        console.log('✅ SMTP Server ready to send emails');
        transporterVerified = true;
      }
    });
  }
  
  return transporter;
}

// Initialize email system on startup
export function initializeEmailSystem() {
  console.log('🔧 Initializing email system...');
  getTransporter();
}

export async function sendInvitationEmail(invitation: Invitation, inviterName: string) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Email not sent for invitation ${invitation.id} - email not configured`);
    return;
  }
  
  // Format assessment names nicely
  const formattedAssessments = invitation.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = formattedAssessments.join(', ');
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const inviteUrl = domain ? `https://${domain}/invite/${invitation.token}` : `http://localhost:5000/invite/${invitation.token}`;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Invitation email sent to ${invitation.candidateEmail} (ID: ${info.messageId})`);
}

export async function sendPasswordResetEmail(email: string, name: string, resetToken: string) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Password reset email not sent for ${email} - email not configured`);
    return;
  }
  
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const baseUrl = domain ? `https://${domain}` : 'http://localhost:5000';
  const resetUrl = `${baseUrl}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
                <a href="${resetUrl}" class="button">Reset Password</a>
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

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Password reset email sent to ${email} (ID: ${info.messageId})`);
}

export async function sendWelcomeEmailWithPassword(email: string, name: string, temporaryPassword: string, note?: string) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Welcome email not sent for ${email} - email not configured`);
    return;
  }
  
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const loginUrl = domain ? `https://${domain}/login` : 'http://localhost:5000/login';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Your Assessment Invitation - HumanMetrix',
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
                <a href="${loginUrl}" class="button">Log In Now</a>
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

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error.message);
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }
}

export async function sendContactFormEmail(
  name: string,
  email: string,
  company: string,
  message: string,
  intent: 'demo' | 'sales'
) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Contact form email not sent - email not configured`);
    return;
  }

  const intentLabel = intent === 'demo' ? 'Demo Request' : 'Sales Inquiry';
  const salesEmail = 'hello@humanmetrix.co.uk';

  const mailOptions = {
    from: `"HumanMetrix Contact Form" <${process.env.GMAIL_USER}>`,
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

  const info = await emailTransporter.sendMail(mailOptions);
  console.log(`✅ Contact form email sent to ${salesEmail} from ${email} (ID: ${info.messageId})`);
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Payment receipt email not sent for ${email} - email not configured`);
    return;
  }

  // Format assessment names for display
  const formattedAssessments = assessments.map(formatAssessmentName);
  const assessmentListHtml = formattedAssessments.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = formattedAssessments.join(', ');
  const amountFormatted = formatCurrencyAmount(totalAmount, currency);

  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
                  Transaction ID: ${sessionId}
                </p>
              </div>
              
              <h3>Next Steps:</h3>
              <ol style="padding-left: 20px;">
                <li>Log in to your HumanMetrix account</li>
                <li>View your comprehensive results and download your PDF report</li>
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
Transaction ID: ${sessionId}

NEXT STEPS:
1. Log in to your HumanMetrix account
2. View your comprehensive results and download your PDF report

If you have any questions, please contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
This is an automated receipt for your records.
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Payment receipt email sent to ${email} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send payment receipt to ${email}:`, error.message);
    // Don't throw error - payment already succeeded, email failure shouldn't break flow
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Quota warning email not sent to ${partnerEmail} - email not configured`);
    return;
  }
  
  const usagePercentage = Math.round((testsUsed / testsTotal) * 100);
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const topUpUrl = domain 
    ? `https://${domain}/developers?tab=billing&action=purchase` 
    : 'http://localhost:5000/developers?tab=billing&action=purchase';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: partnerEmail,
    subject: `Test Quota Alert: 70% Used - ${companyName}`,
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
              <p>This is a friendly reminder that you've used <strong>${usagePercentage}%</strong> of your HumanMetrix test quota.</p>
              
              <div class="stats">
                <p style="margin: 0;"><strong>Current Usage:</strong></p>
                <p style="margin: 10px 0;">
                  <span class="stat-number">${testsUsed}</span> / ${testsTotal} tests used
                </p>
                <p style="margin: 0;">
                  <strong>${testsRemaining} tests remaining</strong>
                </p>
              </div>
              
              <p>To ensure uninterrupted service for your platform, we recommend purchasing additional test credits before your quota runs out.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button">Top Up Your Tests</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>What happens when you run out?</strong><br>
                When your quota reaches 100%, your API access will be temporarily suspended until you purchase more tests.
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

This is a friendly reminder that you've used ${usagePercentage}% of your HumanMetrix test quota.

CURRENT USAGE:
${testsUsed} / ${testsTotal} tests used
${testsRemaining} tests remaining

To ensure uninterrupted service, we recommend purchasing additional test credits before your quota runs out.

Visit ${topUpUrl} to top up your tests.

What happens when you run out?
When your quota reaches 100%, your API access will be temporarily suspended until you purchase more tests.

Questions? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ 70% quota warning email sent to ${partnerEmail} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send 70% quota warning to ${partnerEmail}:`, error.message);
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Urgent quota warning email not sent to ${partnerEmail} - email not configured`);
    return;
  }
  
  const usagePercentage = Math.round((testsUsed / testsTotal) * 100);
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const topUpUrl = domain 
    ? `https://${domain}/developers?tab=billing&action=purchase` 
    : 'http://localhost:5000/developers?tab=billing&action=purchase';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: partnerEmail,
    subject: `URGENT: Test Quota Critical - Only ${testsRemaining} Tests Left!`,
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
                  Your test quota is almost exhausted!
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
              <p>When your quota reaches 100%, your API access will be <strong>automatically suspended</strong> and your embedded assessments will stop working until you purchase more tests.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button">Top Up Now</a>
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

YOUR TEST QUOTA IS ALMOST EXHAUSTED!

CRITICAL USAGE LEVEL:
${usagePercentage}% used
Only ${testsRemaining} tests remaining!

PLEASE TOP UP IMMEDIATELY TO AVOID SERVICE INTERRUPTION.

When your quota reaches 100%, your API access will be automatically suspended and your embedded assessments will stop working until you purchase more tests.

Visit ${topUpUrl} to top up now.

Need help? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ 90% URGENT quota warning email sent to ${partnerEmail} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send 90% quota warning to ${partnerEmail}:`, error.message);
  }
}

// Send notification when API access is suspended
export async function sendPartnerAccessSuspendedEmail(
  partnerEmail: string,
  companyName: string
) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Access suspended email not sent to ${partnerEmail} - email not configured`);
    return;
  }
  
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const topUpUrl = domain 
    ? `https://${domain}/developers?tab=billing&action=purchase` 
    : 'http://localhost:5000/developers?tab=billing&action=purchase';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
              <p style="margin: 10px 0 0 0; color: #e0e7ff;">Your Test Quota Has Been Exhausted</p>
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
              
              <p>Your test quota has been fully consumed. To restore access and reactivate your embedded assessments, please purchase a new test package.</p>
              
              <div style="text-align: center;">
                <a href="${topUpUrl}" class="button">Restore Access - Purchase Tests</a>
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

Your test quota has been fully consumed. To restore access and reactivate your embedded assessments, please purchase a new test package.

Visit ${topUpUrl} to restore access.

Once you purchase additional tests, your API access will be automatically restored and your embedded assessments will resume working immediately.

Need immediate assistance? Contact us at hello@humanmetrix.co.uk

© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Access suspended email sent to ${partnerEmail} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send access suspended email to ${partnerEmail}:`, error.message);
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Auto top-up confirmation not sent to ${partnerEmail} - email not configured`);
    return;
  }
  
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const dashboardUrl = domain ? `https://${domain}/partner-dashboard` : 'http://localhost:5000/partner-dashboard';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
              
              <p>Your auto top-up has been successfully processed. Your test quota has been replenished automatically.</p>
              
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
                <a href="${dashboardUrl}" class="button">View Your Dashboard</a>
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

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Auto top-up confirmation sent to ${partnerEmail} (ID: ${info.messageId})`);
  } catch (error: any) {
    console.error(`❌ Failed to send auto top-up confirmation to ${partnerEmail}:`, error.message);
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
  pricePerTest: number; // In pence
  subtotal: number; // In pence
  vatRate: number; // Percentage (e.g., 20)
  vatAmount: number; // In pence
  totalAmount: number; // In pence
  dueDate: Date;
  paymentTermsDays: number;
  invoiceNotes?: string;
}

// Send invoice email to enterprise partner
export async function sendPartnerInvoiceEmail(details: InvoiceDetails) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Invoice email not sent to ${details.partnerEmail} - email not configured`);
    return;
  }
  
  const formatCurrency = (pence: number) => `£${(pence / 100).toFixed(2)}`;
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  
  const mailOptions = {
    from: `"HumanMetrix Finance" <${process.env.GMAIL_USER}>`,
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
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Invoice email sent to ${details.partnerEmail} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send invoice to ${details.partnerEmail}:`, error.message);
    throw new Error(`Failed to send invoice email: ${error.message}`);
  }
}

export interface PartnerWelcomeDetails {
  partnerName: string;
  companyName: string;
  email: string;
  temporaryPassword: string;
  billingType: 'prepaid' | 'auto_bill' | 'invoice';
  freeTestsAllocated?: number;
}

export async function sendPartnerWelcomeEmail(details: PartnerWelcomeDetails): Promise<{ success: boolean; messageId?: string }> {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Partner welcome email not sent for ${details.email} - email not configured`);
    return { success: false };
  }
  
  const domain = process.env.REPLIT_DOMAINS?.split(',')[0];
  const loginUrl = domain ? `https://${domain}/login` : 'http://localhost:5000/login';
  const developerDocsUrl = domain ? `https://${domain}/developers` : 'http://localhost:5000/developers';
  
  const billingTypeDescriptions: Record<string, string> = {
    prepaid: 'Prepaid (purchase test packages upfront)',
    auto_bill: 'Auto-Bill (monthly charges to card on file)',
    invoice: 'Invoice (monthly invoicing with payment terms)'
  };
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: details.email,
    subject: `Welcome to HumanMetrix Partner Programme - Your Account Details`,
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
            .welcome-badge { background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border: 1px solid #a7f3d0; border-radius: 8px; padding: 15px 20px; margin-bottom: 25px; text-align: center; }
            .welcome-badge span { color: #059669; font-weight: 600; font-size: 14px; }
            .credentials-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .credentials-box h3 { margin: 0 0 15px 0; color: #92400e; font-size: 16px; }
            .credential-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #fcd34d; }
            .credential-row:last-child { border-bottom: none; }
            .credential-label { color: #92400e; font-weight: 500; }
            .credential-value { font-family: monospace; background: #fffbeb; padding: 2px 8px; border-radius: 4px; color: #78350f; }
            .warning { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 15px; margin: 15px 0; color: #991b1b; font-size: 13px; }
            .button { display: inline-block; background: #0891b2; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .button:hover { background: #0e7490; }
            .info-section { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0; }
            .info-section h3 { margin: 0 0 12px 0; color: #0369a1; font-size: 16px; }
            .info-section ul { margin: 0; padding-left: 20px; }
            .info-section li { margin: 8px 0; color: #0c4a6e; }
            .footer { text-align: center; padding: 25px; color: #6b7280; font-size: 14px; background: #f9fafb; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HumanMetrix</h1>
              <p>Partner Programme</p>
            </div>
            <div class="content">
              <div class="welcome-badge">
                <span>Welcome to the Partner Programme</span>
              </div>
              
              <h2 style="margin-top: 0;">Hello ${details.partnerName},</h2>
              <p>Your B2B partner account for <strong>${details.companyName}</strong> has been created. You now have admin access to manage assessments for your organisation.</p>
              
              <div class="credentials-box">
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
              
              <div class="warning">
                <strong>Important:</strong> Please change your password after your first login for security purposes.
              </div>
              
              <div style="text-align: center;">
                <a href="${loginUrl}" class="button">Log In to Your Account</a>
              </div>
              
              <div class="info-section">
                <h3>Your Account Details</h3>
                <ul>
                  <li><strong>Billing Type:</strong> ${billingTypeDescriptions[details.billingType] || details.billingType}</li>
                  ${details.freeTestsAllocated && details.freeTestsAllocated > 0 ? `<li><strong>Complimentary Tests:</strong> ${details.freeTestsAllocated} tests credited to your account</li>` : ''}
                  <li><strong>Role:</strong> Organisation Administrator</li>
                </ul>
              </div>
              
              <div class="info-section">
                <h3>Getting Started</h3>
                <ul>
                  <li>Log in with your credentials above</li>
                  <li>Generate API keys from your dashboard</li>
                  <li>Review our <a href="${developerDocsUrl}" style="color: #0891b2;">Developer Documentation</a> for integration guides</li>
                  <li>Start embedding assessments in your platform</li>
                </ul>
              </div>
              
              <p style="margin-top: 25px;">If you have any questions or need assistance getting started, please don't hesitate to contact us at <a href="mailto:hello@humanmetrix.co.uk" style="color: #0891b2;">hello@humanmetrix.co.uk</a>.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} HumanMetrix Ltd. All rights reserved.</p>
              <p style="margin-top: 10px;">
                <a href="${loginUrl}" style="color: #0891b2; text-decoration: none;">Log In</a> · 
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

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Partner welcome email sent to ${details.email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send partner welcome email to ${details.email}:`, error.message);
    return { success: false };
  }
}

// Send general enquiry email from footer contact form to hello@humanmetrix.co.uk
export async function sendGeneralEnquiryEmail(details: {
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn('General enquiry email not sent - email not configured');
    return { success: false };
  }

  const mailOptions = {
    from: `"HumanMetrix Website" <${process.env.GMAIL_USER}>`,
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

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ General enquiry email sent (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send general enquiry email:`, error.message);
    return { success: false };
  }
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
  temporaryPassword?: string; // Password for new user accounts
}

// Send bulk invitation email from partner to candidate
export async function sendPartnerBulkInvitationEmail(details: PartnerBulkInvitationDetails) {
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Partner bulk invitation email not sent to ${details.candidateEmail} - email not configured`);
    return { success: false };
  }
  
  const assessmentNames = details.assessmentTypes.map(formatAssessmentName);
  const assessmentListHtml = assessmentNames.map(a => `<li>${a}</li>`).join('');
  const assessmentListText = assessmentNames.join(', ');
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPL_SLUG 
      ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER?.toLowerCase()}.repl.co`
      : 'https://humanmetrix.co.uk';
  
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
  
  const mailOptions = {
    from: `"${details.partnerCompanyName} via HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: details.candidateEmail,
    subject: `Assessment Invitation from ${details.partnerCompanyName}`,
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
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Assessment Invitation</p>
            </div>
            <div class="content">
              <h2>Hello ${candidateName},</h2>
              <p>${details.partnerCompanyName} has invited you to complete the following assessments:</p>
              
              <div class="assessments">
                <strong>Assessments to complete:</strong>
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
              
              <p>These assessments are designed to evaluate your skills and capabilities. Click the button below to get started:</p>
              
              <div style="text-align: center;">
                <a href="${assessmentUrl}" class="button">Start Assessments</a>
              </div>
              
              ${expiryDate ? `<p class="expiry-notice">This invitation expires on ${expiryDate}. Please complete the assessments before this date.</p>` : ''}
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${assessmentUrl}" style="color: ${primaryColor};">${assessmentUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>Sent on behalf of ${details.partnerCompanyName}</p>
              <p class="powered-by">Powered by HumanMetrix - AI Assessment Platform</p>
              <p>© ${new Date().getFullYear()} HumanMetrix. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Assessment Invitation from ${details.partnerCompanyName}

Hello ${candidateName},

${details.partnerCompanyName} has invited you to complete the following assessments:
${assessmentListText}

${details.temporaryPassword ? `
YOUR LOGIN CREDENTIALS
An account has been created for you:
Email: ${details.candidateEmail}
Password: ${details.temporaryPassword}

Please save these credentials. You can change your password after logging in.

` : ''}${details.customMessage ? `Message: "${details.customMessage}"\n` : ''}
Click the link below to get started:
${assessmentUrl}

${expiryDate ? `This invitation expires on ${expiryDate}.` : ''}

---
Sent on behalf of ${details.partnerCompanyName}
Powered by HumanMetrix - AI Assessment Platform
© ${new Date().getFullYear()} HumanMetrix
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Partner bulk invitation email sent to ${details.candidateEmail} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send partner bulk invitation email to ${details.candidateEmail}:`, error.message);
    return { success: false, error: error.message };
  }
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`B2B congratulatory email not sent to ${details.email} - email not configured`);
    return { success: false };
  }
  
  const assessmentName = formatAssessmentName(details.assessmentType);
  // Use email as the display name instead of externalUserId
  const displayName = details.email;
  const freeDate = details.freeUnlockDate.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  
  // Build price display with original price crossed out if available
  const priceDisplay = details.originalPaymentAmount 
    ? `<span style="text-decoration: line-through; color: #6b7280; font-size: 18px;">${details.originalPaymentAmount}</span> <span class="price">${details.paymentAmount}</span> <span style="color: #059669; font-size: 14px; font-weight: 600;">25% off</span>`
    : `<span class="price">${details.paymentAmount}</span>`;
  const textPriceDisplay = details.originalPaymentAmount
    ? `${details.originalPaymentAmount} → ${details.paymentAmount} (25% off)`
    : details.paymentAmount;
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
                  <p style="margin: 5px 0; font-size: 14px; color: #0369a1;">Receive a comprehensive PDF report with insights and recommendations.</p>
                </div>
                
                <div style="text-align: center;">
                  <a href="${details.paymentUrl}" class="button">Unlock Results Now</a>
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
Receive a comprehensive PDF report with insights and recommendations.

Click here to unlock your results: ${details.paymentUrl}

FREE ACCESS
Your results will be available for free on ${freeDate}.
We'll send you an email when your results are ready.

---
Thank you for completing your assessment!
© ${new Date().getFullYear()} HumanMetrix. All rights reserved.
    `.trim(),
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ B2B congratulatory email sent to ${details.email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send B2B congratulatory email to ${details.email}:`, error.message);
    return { success: false, error: error.message };
  }
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`B2B results email not sent to ${details.email} - email not configured`);
    return { success: false };
  }
  
  const assessmentName = formatAssessmentName(details.assessmentType);
  const candidateName = details.candidateName || 'there';
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'https://humanmetrix.co.uk';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: details.email,
    subject: `Your ${assessmentName} Results Are Ready`,
    attachments: [
      {
        filename: details.pdfFilename,
        content: details.pdfBuffer,
        contentType: 'application/pdf',
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
                <div class="pdf-icon">📄</div>
                <p style="margin: 0; font-weight: 600; color: #0891b2;">${details.pdfFilename}</p>
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

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ B2B results email with PDF sent to ${details.email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send B2B results email to ${details.email}:`, error.message);
    return { success: false, error: error.message };
  }
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
  const emailTransporter = getTransporter();
  
  if (!emailTransporter) {
    console.warn(`Partner team invitation email not sent to ${details.email} - email not configured`);
    return { success: false, error: 'Email not configured' };
  }
  
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : process.env.REPLIT_DOMAINS?.split(',')[0] 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : 'https://www.humanmetrix.co.uk';
  
  const acceptUrl = `${baseUrl}/partner/accept-invite/${details.inviteToken}`;
  const greeting = details.inviteeName ? `Hello ${details.inviteeName},` : 'Hello,';
  const roleDisplay = details.role === 'admin' ? 'Administrator' : details.role === 'member' ? 'Team Member' : 'Viewer';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
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
                <a href="${acceptUrl}" class="button">Accept Invitation</a>
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
  
  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`✅ Partner team invitation email sent to ${details.email} (ID: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`❌ Failed to send partner team invitation email to ${details.email}:`, error.message);
    return { success: false, error: error.message };
  }
}
