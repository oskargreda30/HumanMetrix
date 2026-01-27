import { storage } from './storage';

interface ApiAuthAttempt {
  count: number;
  windowStart: number;
  notifiedAt?: number;
}

interface IpTracker {
  knownIps: Set<string>;
  lastNotified?: number;
}

const apiAuthFailures = new Map<string, ApiAuthAttempt>();
const partnerIpTracker = new Map<string, IpTracker>();

const API_AUTH_FAILURE_THRESHOLD = 5;
const API_AUTH_WINDOW_MS = 15 * 60 * 1000;
const NEW_IP_COOLDOWN_MS = 60 * 60 * 1000;

export async function notifyTeamMemberRoleChanged(
  partnerId: string,
  memberId: string,
  memberEmail: string,
  memberName: string | null,
  oldRole: string,
  newRole: string,
  changedByTeamMemberId?: string,
  changedByUserId?: string
): Promise<void> {
  try {
    const displayName = memberName || memberEmail;
    const roleLabels: Record<string, string> = {
      admin: 'Admin',
      billing_admin: 'Billing Admin',
      member: 'Member',
      viewer: 'Viewer',
    };
    const oldRoleLabel = roleLabels[oldRole] || oldRole;
    const newRoleLabel = roleLabels[newRole] || newRole;

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'team_member_role_changed',
      title: 'Team Member Role Updated',
      message: `${displayName}'s role has been changed from ${oldRoleLabel} to ${newRoleLabel}.`,
      metadata: {
        memberId,
        memberEmail,
        memberName,
        oldRole,
        newRole,
        changedAt: new Date().toISOString(),
      },
      actorTeamMemberId: changedByTeamMemberId,
      actorUserId: changedByUserId,
      subjectTeamMemberId: memberId,
    });

    console.log(`[Partner Notification] Role change: ${displayName} (${oldRole} -> ${newRole})`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify role change:', error.message);
  }
}

export async function notifyApiKeyRegenerated(
  partnerId: string,
  regeneratedByTeamMemberId?: string,
  regeneratedByUserId?: string
): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'api_key_regenerated',
      title: 'API Key Regenerated',
      message: 'Your API key has been regenerated. All existing integrations using the old key will stop working. Please update your systems immediately.',
      metadata: {
        regeneratedAt: new Date().toISOString(),
        actionRequired: true,
      },
      actorTeamMemberId: regeneratedByTeamMemberId,
      actorUserId: regeneratedByUserId,
    });

    const { sendPartnerSecurityAlert } = await import('./email');
    const adminMembers = await storage.getPartnerTeamMembersByRole(partnerId, ['admin', 'billing_admin']);
    
    for (const member of adminMembers) {
      if (member.email) {
        await sendPartnerSecurityAlert(
          member.email,
          partner.companyName,
          'API Key Regenerated',
          'Your API key has been regenerated. All existing integrations using the old key will stop working immediately. Please update your integration configurations with the new API key.'
        );
      }
    }

    console.log(`[Partner Notification] API key regenerated for partner ${partner.companyName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify API key regeneration:', error.message);
  }
}

export async function trackApiAuthFailure(
  partnerId: string,
  apiKey: string,
  ipAddress?: string
): Promise<void> {
  const key = partnerId;
  const now = Date.now();

  const existing = apiAuthFailures.get(key);

  if (existing && (now - existing.windowStart) < API_AUTH_WINDOW_MS) {
    existing.count++;

    if (existing.count >= API_AUTH_FAILURE_THRESHOLD && !existing.notifiedAt) {
      existing.notifiedAt = now;
      await notifyApiAuthFailures(partnerId, existing.count, apiKey, ipAddress);
    }
  } else {
    apiAuthFailures.set(key, {
      count: 1,
      windowStart: now,
    });
  }
}

async function notifyApiAuthFailures(
  partnerId: string,
  attemptCount: number,
  lastApiKey: string,
  ipAddress?: string
): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    const maskedKey = lastApiKey.length > 8 
      ? `${lastApiKey.substring(0, 4)}...${lastApiKey.substring(lastApiKey.length - 4)}`
      : '****';

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'api_auth_failed',
      title: 'Multiple Failed API Authentication Attempts',
      message: `${attemptCount} failed API authentication attempts detected in the last 15 minutes. This may indicate an incorrect API key or unauthorized access attempt.`,
      metadata: {
        attemptCount,
        maskedKey,
        ipAddress,
        detectedAt: new Date().toISOString(),
      },
    });

    const { sendPartnerSecurityAlert } = await import('./email');
    const adminMembers = await storage.getPartnerTeamMembersByRole(partnerId, ['admin']);
    
    for (const member of adminMembers) {
      if (member.email) {
        await sendPartnerSecurityAlert(
          member.email,
          partner.companyName,
          'Failed API Authentication Attempts',
          `We detected ${attemptCount} failed API authentication attempts in the last 15 minutes${ipAddress ? ` from IP ${ipAddress}` : ''}. This may indicate an incorrect API key configuration or an unauthorized access attempt. If you did not initiate these requests, please regenerate your API key immediately.`
        );
      }
    }

    console.log(`[Partner Notification] API auth failures: ${attemptCount} attempts for ${partner.companyName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify API auth failures:', error.message);
  }
}

export async function trackNewIpAccess(
  partnerId: string,
  ipAddress: string
): Promise<void> {
  if (!ipAddress || ipAddress === 'unknown') return;

  const now = Date.now();
  let tracker = partnerIpTracker.get(partnerId);

  if (!tracker) {
    tracker = { knownIps: new Set() };
    partnerIpTracker.set(partnerId, tracker);
  }

  if (!tracker.knownIps.has(ipAddress)) {
    tracker.knownIps.add(ipAddress);
    
    if (tracker.knownIps.size > 1) {
      const shouldNotify = !tracker.lastNotified || 
        (now - tracker.lastNotified) > NEW_IP_COOLDOWN_MS;

      if (shouldNotify) {
        tracker.lastNotified = now;
        await notifyNewIpAccess(partnerId, ipAddress, tracker.knownIps.size);
      }
    }
  }
}

async function notifyNewIpAccess(
  partnerId: string,
  newIpAddress: string,
  totalKnownIps: number
): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'new_ip_access',
      title: 'New IP Address Detected',
      message: `API access detected from a new IP address: ${newIpAddress}. This is the ${totalKnownIps}${getOrdinalSuffix(totalKnownIps)} unique IP accessing your API.`,
      metadata: {
        newIpAddress,
        totalKnownIps,
        detectedAt: new Date().toISOString(),
      },
    });

    console.log(`[Partner Notification] New IP access: ${newIpAddress} for ${partner.companyName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify new IP access:', error.message);
  }
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export async function notifyPartnerQuotaThreshold(
  partnerId: string,
  usagePercentage: number,
  used: number,
  total: number,
  remaining: number
): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    const isUrgent = usagePercentage >= 95;
    const threshold = isUrgent ? '95%' : '80%';

    await storage.dispatchPartnerNotification({
      partnerId,
      type: isUrgent ? 'quota_critical' : 'quota_warning',
      title: isUrgent ? 'Critical: Quota Almost Exhausted' : 'Quota Usage Warning',
      message: isUrgent
        ? `You have used ${usagePercentage}% of your assessment credits. Only ${remaining} credits remaining. Top up now to avoid service interruption.`
        : `You have used ${usagePercentage}% of your assessment credits. ${remaining} credits remaining.`,
      metadata: {
        usagePercentage,
        used,
        total,
        remaining,
        threshold,
        detectedAt: new Date().toISOString(),
      },
    });

    const { sendPartnerQuotaWarning70, sendPartnerQuotaWarning90 } = await import('./email');
    const billingMembers = await storage.getPartnerTeamMembersByRole(partnerId, ['admin', 'billing_admin']);
    
    for (const member of billingMembers) {
      if (member.email) {
        if (isUrgent) {
          await sendPartnerQuotaWarning90(member.email, partner.companyName, used, total, remaining);
        } else {
          await sendPartnerQuotaWarning70(member.email, partner.companyName, used, total, remaining);
        }
      }
    }

    console.log(`[Partner Notification] Quota ${threshold} threshold: ${partner.companyName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify quota threshold:', error.message);
  }
}

export async function notifyAssessmentCompleted(
  partnerId: string,
  candidateEmail: string,
  candidateName: string | null,
  assessmentType: string,
  allCompleted: boolean,
  options?: {
    assessmentCount?: number;
    invitationId?: string;
  }
): Promise<void> {
  try {
    const displayName = candidateName || candidateEmail;

    if (allCompleted) {
      const count = options?.assessmentCount || 4;
      const assessmentWord = count === 1 ? 'assessment' : 'assessments';
      const countText = count === 4 ? 'all four assessments' : `all ${count} assigned ${assessmentWord}`;
      
      await storage.dispatchPartnerNotification({
        partnerId,
        type: 'assessment_all_completed',
        title: 'Candidate Completed All Assessments',
        message: `${displayName} has completed ${countText} and their results are now available for review.`,
        metadata: {
          candidateEmail,
          candidateName,
          completedAt: new Date().toISOString(),
          invitationId: options?.invitationId,
          assessmentCount: count,
        },
      });

      console.log(`[Partner Notification] All ${count} assessments completed: ${displayName}`);
    }
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify assessment completion:', error.message);
  }
}

export async function notifyAssessmentLinkExpired(
  partnerId: string,
  candidateEmail: string,
  candidateName: string | null,
  expirationDate: Date
): Promise<void> {
  try {
    const displayName = candidateName || candidateEmail;

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'assessment_link_expired',
      title: 'Assessment Link Expired',
      message: `The assessment invitation for ${displayName} has expired without completion. Consider resending an invitation.`,
      metadata: {
        candidateEmail,
        candidateName,
        expiredAt: expirationDate.toISOString(),
      },
    });

    console.log(`[Partner Notification] Assessment link expired: ${displayName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify link expiration:', error.message);
  }
}

export async function notifyHighIncompleteRate(
  partnerId: string,
  incompleteCount: number,
  totalInvitations: number,
  incompleteRate: number
): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'high_incomplete_rate',
      title: 'High Assessment Incomplete Rate',
      message: `${incompleteCount} of your last ${totalInvitations} assessment invitations (${incompleteRate}%) were not completed. This may indicate issues with candidate engagement or technical problems.`,
      metadata: {
        incompleteCount,
        totalInvitations,
        incompleteRate,
        period: 'last 30 days',
        detectedAt: new Date().toISOString(),
      },
    });

    console.log(`[Partner Notification] High incomplete rate: ${incompleteRate}% for ${partner.companyName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to notify high incomplete rate:', error.message);
  }
}

export async function sendMonthlyUsageSummary(partnerId: string): Promise<void> {
  try {
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) return;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const usage = await storage.getPartnerUsageForPeriod(partnerId, startOfMonth, endOfMonth);
    const monthName = startOfMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

    await storage.dispatchPartnerNotification({
      partnerId,
      type: 'monthly_summary',
      title: `Monthly Usage Summary - ${monthName}`,
      message: `Your ${monthName} usage: ${usage.testsUsed} assessments completed. ${usage.remaining} credits remaining.`,
      metadata: {
        month: monthName,
        testsUsed: usage.testsUsed,
        testsRemaining: usage.remaining,
        period: {
          start: startOfMonth.toISOString(),
          end: endOfMonth.toISOString(),
        },
      },
    });

    const { sendPartnerMonthlySummary } = await import('./email');
    const adminMembers = await storage.getPartnerTeamMembersByRole(partnerId, ['admin', 'billing_admin']);
    
    for (const member of adminMembers) {
      if (member.email) {
        await sendPartnerMonthlySummary(
          member.email,
          partner.companyName,
          monthName,
          usage.testsUsed,
          usage.remaining
        );
      }
    }

    console.log(`[Partner Notification] Monthly summary sent for ${partner.companyName}: ${usage.testsUsed} tests in ${monthName}`);
  } catch (error: any) {
    console.error('[Partner Notification] Failed to send monthly summary:', error.message);
  }
}
