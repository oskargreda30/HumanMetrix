import nodemailer from 'nodemailer';
import type { Invitation } from '@shared/schema';

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
  const assessmentList = invitation.assessmentTypes.join(', ');
  const inviteUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/invite/${invitation.token}`;
  
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
                <strong>Assessments:</strong> ${assessmentList}
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

Assessments: ${assessmentList}

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
  
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
  const resetUrl = `https://${baseUrl}/reset-password/${resetToken}`;
  
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
  
  const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000';
  const loginUrl = `https://${baseUrl}/login`;
  
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
                If you need help, please don't hesitate to reach out to your assessment coordinator at humanmetrix.sales@gmail.com
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
  const salesEmail = 'humanmetrix.sales@gmail.com';

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

  const assessmentList = assessments.join(', ');
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
                <p><strong>Assessments Purchased:</strong></p>
                <p style="margin-left: 20px;">${assessmentList}</p>
                
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
                <li>Complete your assessments from the dashboard</li>
                <li>View your comprehensive results and download your PDF report</li>
              </ol>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                If you have any questions, please contact us at humanmetrix.sales@gmail.com
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
Assessments Purchased: ${assessmentList}
Total Paid: ${amountFormatted}
Transaction ID: ${sessionId}

NEXT STEPS:
1. Log in to your HumanMetrix account
2. Complete your assessments from the dashboard
3. View your comprehensive results and download your PDF report

If you have any questions, please contact us at humanmetrix.sales@gmail.com

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
