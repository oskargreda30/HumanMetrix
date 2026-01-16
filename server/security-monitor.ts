import { db } from './db';
import { sql } from 'drizzle-orm';

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  notifiedAt?: number;
}

const failedLoginAttempts = new Map<string, LoginAttempt>();
const apiCallTracker = new Map<string, { count: number; windowStart: number; notifiedAt?: number }>();

const FAILED_LOGIN_THRESHOLD = 5;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const SUSPICIOUS_API_CALLS_THRESHOLD = 100;
const SUSPICIOUS_API_WINDOW_MS = 60 * 1000;
const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;

export async function trackFailedLogin(email: string, ipAddress?: string): Promise<void> {
  const key = email.toLowerCase();
  const now = Date.now();
  
  const existing = failedLoginAttempts.get(key);
  
  if (existing && (now - existing.lastAttempt) < FAILED_LOGIN_WINDOW_MS) {
    existing.count++;
    existing.lastAttempt = now;
    
    if (existing.count >= FAILED_LOGIN_THRESHOLD) {
      const shouldNotify = !existing.notifiedAt || 
        (now - existing.notifiedAt) > NOTIFICATION_COOLDOWN_MS;
      
      if (shouldNotify) {
        existing.notifiedAt = now;
        await notifyFailedLoginAttempts(email, existing.count, ipAddress);
      }
    }
  } else {
    failedLoginAttempts.set(key, {
      count: 1,
      lastAttempt: now,
    });
  }
}

export function clearFailedLoginAttempts(email: string): void {
  failedLoginAttempts.delete(email.toLowerCase());
}

async function notifyFailedLoginAttempts(email: string, attemptCount: number, ipAddress?: string): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    
    const ipInfo = ipAddress ? `Last attempt from IP: ${ipAddress}` : '';
    
    await notifySuperAdmins({
      type: 'security_alert',
      title: 'Multiple Failed Login Attempts Detected',
      message: `Account ${email} has had ${attemptCount} failed login attempts in the last 15 minutes. ${ipInfo} This may indicate a brute force attack.`,
      severity: 'warning',
      metadata: {
        email,
        attemptCount,
        ipAddress,
        detectedAt: new Date().toISOString(),
      },
      emailSubject: `[Security Alert] Multiple Failed Login Attempts - ${email}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Security Alert</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Multiple Failed Login Attempts</h2>
            <p style="color: #4b5563;">The following account has experienced multiple failed login attempts:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #dc2626;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
              <p style="margin: 5px 0;"><strong>Failed Attempts:</strong> ${attemptCount}</p>
              <p style="margin: 5px 0;"><strong>Time Window:</strong> Last 15 minutes</p>
              ${ipAddress ? `<p style="margin: 5px 0;"><strong>Last IP Address:</strong> ${ipAddress}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Detected At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #dc2626; font-weight: bold;">This may indicate a brute force attack. Consider reviewing account security.</p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix Security Monitoring</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Security] Notified super admins about failed login attempts for ${email}`);
  } catch (error: any) {
    console.error('[Security] Failed to notify about failed logins:', error.message);
  }
}

export async function notifyNewAdminCreated(
  newAdminUserId: string,
  newAdminEmail: string,
  role: string,
  createdByUserId?: string,
  createdByEmail?: string
): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    
    const roleLabel = role === 'super_admin' ? 'Super Admin' : 'Admin';
    const severity = role === 'super_admin' ? 'critical' : 'warning';
    
    await notifySuperAdmins({
      type: 'admin_created',
      title: `New ${roleLabel} Account Created`,
      message: `A new ${roleLabel} account has been created for ${newAdminEmail}.${createdByEmail ? ` Created by: ${createdByEmail}` : ''}`,
      severity: severity as 'warning' | 'critical',
      metadata: {
        newAdminUserId,
        newAdminEmail,
        role,
        createdByUserId,
        createdByEmail,
        createdAt: new Date().toISOString(),
      },
      emailSubject: `[Admin Alert] New ${roleLabel} Created - ${newAdminEmail}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Admin Account Created</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">New ${roleLabel} Account</h2>
            <p style="color: #4b5563;">A new administrator account with elevated privileges has been created:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #7c3aed;">
              <p style="margin: 5px 0;"><strong>Email:</strong> ${newAdminEmail}</p>
              <p style="margin: 5px 0;"><strong>Role:</strong> ${roleLabel}</p>
              <p style="margin: 5px 0;"><strong>User ID:</strong> ${newAdminUserId}</p>
              ${createdByEmail ? `<p style="margin: 5px 0;"><strong>Created By:</strong> ${createdByEmail}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Created At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #4b5563;">If you did not authorize this action, please investigate immediately.</p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix Security Monitoring</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Security] Notified super admins about new ${roleLabel}: ${newAdminEmail}`);
  } catch (error: any) {
    console.error('[Security] Failed to notify about new admin:', error.message);
  }
}

export async function trackApiCall(partnerId: string, endpoint: string): Promise<boolean> {
  const key = partnerId;
  const now = Date.now();
  
  const existing = apiCallTracker.get(key);
  
  if (existing && (now - existing.windowStart) < SUSPICIOUS_API_WINDOW_MS) {
    existing.count++;
    
    // Check if threshold reached and not already notified in this window
    if (existing.count >= SUSPICIOUS_API_CALLS_THRESHOLD && !existing.notifiedAt) {
      existing.notifiedAt = now;
      await notifySuspiciousActivity(partnerId, existing.count, endpoint);
      return true;
    }
  } else {
    apiCallTracker.set(key, {
      count: 1,
      windowStart: now,
    });
  }
  
  return false;
}

async function notifySuspiciousActivity(partnerId: string, callCount: number, lastEndpoint: string): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    const { storage } = await import('./storage');
    
    const partner = await storage.getPartnerAccount(partnerId);
    const partnerName = partner?.companyName || partnerId;
    
    await notifySuperAdmins({
      type: 'suspicious_activity',
      title: 'Suspicious API Activity Detected',
      message: `Partner "${partnerName}" has made ${callCount} API calls in the last minute. Last endpoint: ${lastEndpoint}. This may indicate automated abuse or misconfigured integration.`,
      severity: 'warning',
      metadata: {
        partnerId,
        partnerName,
        callCount,
        lastEndpoint,
        windowSeconds: 60,
        detectedAt: new Date().toISOString(),
      },
      emailSubject: `[Security Alert] Suspicious API Activity - ${partnerName}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Suspicious Activity</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">High Volume API Activity Detected</h2>
            <p style="color: #4b5563;">Unusual API activity has been detected from a partner:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 5px 0;"><strong>Partner:</strong> ${partnerName}</p>
              <p style="margin: 5px 0;"><strong>Partner ID:</strong> ${partnerId}</p>
              <p style="margin: 5px 0;"><strong>API Calls:</strong> ${callCount} in 60 seconds</p>
              <p style="margin: 5px 0;"><strong>Last Endpoint:</strong> ${lastEndpoint}</p>
              <p style="margin: 5px 0;"><strong>Detected At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #f59e0b; font-weight: bold;">This may indicate automated abuse or a misconfigured integration.</p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix Security Monitoring</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Security] Notified super admins about suspicious activity from partner ${partnerName}`);
  } catch (error: any) {
    console.error('[Security] Failed to notify about suspicious activity:', error.message);
  }
}

export async function notifyHighApiUsage(
  partnerId: string,
  partnerName: string,
  usagePercentage: number,
  remaining: number,
  total: number
): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    
    const severity = usagePercentage >= 95 ? 'critical' : 'warning';
    const threshold = usagePercentage >= 95 ? '95%' : '80%';
    
    await notifySuperAdmins({
      type: 'high_api_usage',
      title: `Partner Approaching API Limit (${threshold})`,
      message: `Partner "${partnerName}" has used ${usagePercentage.toFixed(1)}% of their API quota. ${remaining} of ${total} credits remaining.`,
      severity: severity as 'warning' | 'critical',
      metadata: {
        partnerId,
        partnerName,
        usagePercentage,
        remaining,
        total,
        threshold,
        detectedAt: new Date().toISOString(),
      },
      emailSubject: `[Usage Alert] Partner API Usage at ${threshold} - ${partnerName}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${severity === 'critical' ? '#dc2626, #b91c1c' : '#f59e0b, #d97706'}); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">API Usage Alert</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Partner Approaching Quota Limit</h2>
            <p style="color: #4b5563;">A partner is approaching their API usage limit:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${severity === 'critical' ? '#dc2626' : '#f59e0b'};">
              <p style="margin: 5px 0;"><strong>Partner:</strong> ${partnerName}</p>
              <p style="margin: 5px 0;"><strong>Usage:</strong> ${usagePercentage.toFixed(1)}%</p>
              <p style="margin: 5px 0;"><strong>Credits Remaining:</strong> ${remaining} of ${total}</p>
              <p style="margin: 5px 0;"><strong>Threshold:</strong> ${threshold}</p>
            </div>
            <p style="color: #4b5563;">The partner may need to purchase additional credits or upgrade their plan.</p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix Security Monitoring</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Security] Notified super admins about high API usage for partner ${partnerName}`);
  } catch (error: any) {
    console.error('[Security] Failed to notify about high API usage:', error.message);
  }
}

export async function checkDatabaseSize(): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size,
             pg_database_size(current_database()) as size_bytes
    `);
    
    if (result.rows && result.rows.length > 0) {
      const sizeBytes = Number(result.rows[0].size_bytes);
      const sizePretty = result.rows[0].size as string;
      
      const maxSizeBytes = 10 * 1024 * 1024 * 1024;
      const usagePercentage = (sizeBytes / maxSizeBytes) * 100;
      
      if (usagePercentage >= 90) {
        await notifyDatabaseThreshold(usagePercentage, sizePretty, '90%', 'critical');
      } else if (usagePercentage >= 80) {
        await notifyDatabaseThreshold(usagePercentage, sizePretty, '80%', 'warning');
      }
      
      console.log(`[Database] Size check: ${sizePretty} (${usagePercentage.toFixed(1)}% of 10GB limit)`);
    }
  } catch (error: any) {
    console.error('[Database] Failed to check database size:', error.message);
  }
}

async function notifyDatabaseThreshold(
  usagePercentage: number,
  currentSize: string,
  threshold: string,
  severity: 'warning' | 'critical'
): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    
    await notifySuperAdmins({
      type: 'database_threshold',
      title: `Database Size Alert (${threshold} Threshold)`,
      message: `Database has reached ${usagePercentage.toFixed(1)}% capacity (${currentSize}). Consider archiving old data or upgrading storage.`,
      severity,
      metadata: {
        usagePercentage,
        currentSize,
        threshold,
        maxSize: '10GB',
        checkedAt: new Date().toISOString(),
      },
      emailSubject: `[Database Alert] Storage at ${threshold} Capacity`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, ${severity === 'critical' ? '#dc2626, #b91c1c' : '#f59e0b, #d97706'}); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Database Alert</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Database Capacity Warning</h2>
            <p style="color: #4b5563;">The database is approaching its storage limit:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid ${severity === 'critical' ? '#dc2626' : '#f59e0b'};">
              <p style="margin: 5px 0;"><strong>Current Size:</strong> ${currentSize}</p>
              <p style="margin: 5px 0;"><strong>Usage:</strong> ${usagePercentage.toFixed(1)}%</p>
              <p style="margin: 5px 0;"><strong>Threshold:</strong> ${threshold}</p>
              <p style="margin: 5px 0;"><strong>Max Size:</strong> 10GB</p>
            </div>
            <p style="color: ${severity === 'critical' ? '#dc2626' : '#f59e0b'}; font-weight: bold;">
              ${severity === 'critical' 
                ? 'CRITICAL: Immediate action required. Consider archiving old data or upgrading storage.'
                : 'Warning: Consider archiving old data or planning for storage upgrade.'}
            </p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix System Monitoring</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Database] Notified super admins about ${threshold} threshold breach`);
  } catch (error: any) {
    console.error('[Database] Failed to notify about threshold:', error.message);
  }
}

export async function notifyPartnerDeactivation(
  partnerId: string,
  partnerName: string,
  reason: string,
  deactivatedByUserId?: string,
  deactivatedByEmail?: string
): Promise<void> {
  try {
    const { notifySuperAdmins } = await import('./email');
    
    await notifySuperAdmins({
      type: 'partner_deactivated',
      title: 'Partner Account Deactivated',
      message: `Partner "${partnerName}" has been deactivated. Reason: ${reason}${deactivatedByEmail ? `. Deactivated by: ${deactivatedByEmail}` : ''}`,
      severity: 'warning',
      metadata: {
        partnerId,
        partnerName,
        reason,
        deactivatedByUserId,
        deactivatedByEmail,
        deactivatedAt: new Date().toISOString(),
      },
      emailSubject: `[Partner Alert] Account Deactivated - ${partnerName}`,
      emailHtml: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Partner Deactivated</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb;">
            <h2 style="color: #1f2937; margin-top: 0;">Partner Account Deactivated</h2>
            <p style="color: #4b5563;">A partner account has been deactivated:</p>
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #6b7280;">
              <p style="margin: 5px 0;"><strong>Partner:</strong> ${partnerName}</p>
              <p style="margin: 5px 0;"><strong>Partner ID:</strong> ${partnerId}</p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${reason}</p>
              ${deactivatedByEmail ? `<p style="margin: 5px 0;"><strong>Deactivated By:</strong> ${deactivatedByEmail}</p>` : ''}
              <p style="margin: 5px 0;"><strong>Deactivated At:</strong> ${new Date().toLocaleString()}</p>
            </div>
            <p style="color: #4b5563;">The partner's API access has been suspended and they can no longer use the platform.</p>
          </div>
          <div style="background: #1f2937; padding: 20px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">HumanMetrix Partner Management</p>
          </div>
        </div>
      `,
    });
    
    console.log(`[Security] Notified super admins about partner deactivation: ${partnerName}`);
  } catch (error: any) {
    console.error('[Security] Failed to notify about partner deactivation:', error.message);
  }
}

setInterval(() => {
  const now = Date.now();
  
  for (const [key, value] of failedLoginAttempts.entries()) {
    if (now - value.lastAttempt > FAILED_LOGIN_WINDOW_MS * 2) {
      failedLoginAttempts.delete(key);
    }
  }
  
  for (const [key, value] of apiCallTracker.entries()) {
    if (now - value.windowStart > SUSPICIOUS_API_WINDOW_MS * 2) {
      apiCallTracker.delete(key);
    }
  }
}, 5 * 60 * 1000);

console.log('[Security Monitor] Initialized');
