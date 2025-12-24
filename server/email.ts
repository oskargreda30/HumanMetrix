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
                <strong>⚠️ Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
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

⚠️ This link will expire in 1 hour.

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
                If you need help, please don't hesitate to reach out to your assessment coordinator at info@humanmetrix.co.uk
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
  const salesEmail = 'info@humanmetrix.co.uk';

  const mailOptions = {
    from: `"HumanMetrix Contact Form" <${process.env.GMAIL_USER}>`,
    to: salesEmail,
    cc: process.env.GMAIL_USER, // CC to main inbox as backup
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

export async function sendPaymentReceiptEmail(
  email: string,
  name: string,
  assessments: string[],
  totalAmount: number,
  sessionId: string
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
  const amountFormatted = `£${(totalAmount / 100).toFixed(2)}`;

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
                If you have any questions, please contact us at info@humanmetrix.co.uk
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

If you have any questions, please contact us at info@humanmetrix.co.uk

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
  const topUpUrl = domain ? `https://${domain}/developers` : 'http://localhost:5000/developers';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: partnerEmail,
    subject: `⚠️ Test Quota Alert: 70% Used - ${companyName}`,
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
              <h1 style="margin: 0;">⚠️ Quota Alert</h1>
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
              <p>Questions? Contact us at info@humanmetrix.co.uk</p>
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

Questions? Contact us at info@humanmetrix.co.uk

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
  const topUpUrl = domain ? `https://${domain}/developers` : 'http://localhost:5000/developers';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: partnerEmail,
    subject: `🚨 URGENT: Test Quota Critical - Only ${testsRemaining} Tests Left!`,
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
              <h1 style="margin: 0;">🚨 URGENT: Quota Critical</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Immediate Action Required</p>
            </div>
            <div class="content">
              <h2>Hello ${companyName},</h2>
              
              <div class="urgent">
                <p style="margin: 0; font-size: 18px; font-weight: bold; color: #dc2626;">
                  ⚠️ Your test quota is almost exhausted!
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
                <a href="${topUpUrl}" class="button">🛒 Top Up Now</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need help? Our team is available at info@humanmetrix.co.uk
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
🚨 URGENT: Quota Critical - HumanMetrix

Hello ${companyName},

⚠️ YOUR TEST QUOTA IS ALMOST EXHAUSTED!

CRITICAL USAGE LEVEL:
${usagePercentage}% used
Only ${testsRemaining} tests remaining!

PLEASE TOP UP IMMEDIATELY TO AVOID SERVICE INTERRUPTION.

When your quota reaches 100%, your API access will be automatically suspended and your embedded assessments will stop working until you purchase more tests.

Visit ${topUpUrl} to top up now.

Need help? Contact us at info@humanmetrix.co.uk

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
  const topUpUrl = domain ? `https://${domain}/developers` : 'http://localhost:5000/developers';
  
  const mailOptions = {
    from: `"HumanMetrix" <${process.env.GMAIL_USER}>`,
    to: partnerEmail,
    subject: `🔴 API Access Suspended - Quota Exhausted`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1f2937 0%, #111827 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
            .button { display: inline-block; background: #10b981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
            .suspended { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1f2937; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔴 Access Suspended</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Your Test Quota Has Been Exhausted</p>
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
                <a href="${topUpUrl}" class="button">✅ Restore Access - Purchase Tests</a>
              </div>
              
              <p>Once you purchase additional tests, your API access will be <strong>automatically restored</strong> and your embedded assessments will resume working immediately.</p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Need immediate assistance? Contact us at info@humanmetrix.co.uk
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

Need immediate assistance? Contact us at info@humanmetrix.co.uk

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
                Questions about this invoice? Contact us at <a href="mailto:info@humanmetrix.co.uk" style="color: #06b6d4;">info@humanmetrix.co.uk</a>
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
Questions about this invoice? Contact us at info@humanmetrix.co.uk

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
