import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import type { PartnerAccount, PartnerApiKey } from "@shared/schema";

export interface PartnerRequest extends Request {
  partner?: PartnerAccount;
  apiKey?: PartnerApiKey;
}

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function generateApiKey(environment: "test" | "live" = "test"): {
  fullKey: string;
  prefix: string;
  hash: string;
  hint: string;
} {
  const prefix = environment === "live" ? "hm_live_" : "hm_test_";
  const randomPart = Array.from({ length: 32 }, () =>
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
      Math.floor(Math.random() * 62)
    )
  ).join("");
  
  const fullKey = prefix + randomPart;
  const hash = bcrypt.hashSync(fullKey, 10);
  const hint = fullKey.slice(-4);
  
  return { fullKey, prefix, hash, hint };
}

export async function validateApiKey(apiKey: string): Promise<{
  valid: boolean;
  partner?: PartnerAccount;
  keyRecord?: PartnerApiKey;
  error?: string;
}> {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  const prefix = apiKey.slice(0, 8);
  const keyRecord = await storage.getPartnerApiKeyByPrefix(prefix);
  
  if (!keyRecord) {
    return { valid: false, error: "Invalid API key" };
  }
  
  if (!keyRecord.isActive) {
    return { valid: false, error: "API key has been revoked" };
  }
  
  if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
    return { valid: false, error: "API key has expired" };
  }
  
  const isValid = bcrypt.compareSync(apiKey, keyRecord.keyHash);
  if (!isValid) {
    return { valid: false, error: "Invalid API key" };
  }
  
  const partner = await storage.getPartnerAccount(keyRecord.partnerId);
  if (!partner) {
    return { valid: false, error: "Partner account not found" };
  }
  
  if (!partner.isActive) {
    return { valid: false, error: "Partner account is inactive" };
  }
  
  // Check if partner is suspended due to quota exhaustion
  if (partner.apiAccessSuspendedAt) {
    return { 
      valid: false, 
      error: "API access suspended: Test quota exhausted. Please purchase more tests to continue." 
    };
  }
  
  await storage.updatePartnerApiKeyLastUsed(keyRecord.id);
  
  return { valid: true, partner, keyRecord };
}

function checkRateLimit(keyId: string, limit: number): boolean {
  const now = Date.now();
  const windowMs = 60000;
  
  const entry = rateLimitMap.get(keyId);
  
  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(keyId, { count: 1, resetAt: now + windowMs });
    return true;
  }
  
  if (entry.count >= limit) {
    return false;
  }
  
  entry.count++;
  return true;
}

export function partnerAuth(requiredPermissions: string[] = []) {
  return async (req: PartnerRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Missing or invalid Authorization header. Use: Bearer <api_key>",
        });
      }
      
      const apiKey = authHeader.slice(7);
      const result = await validateApiKey(apiKey);
      
      if (!result.valid) {
        const prefix = apiKey.slice(0, 8);
        const keyRecord = await storage.getPartnerApiKeyByPrefix(prefix);
        if (keyRecord) {
          try {
            const { trackApiAuthFailure } = await import('./partner-notifications');
            const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                             req.socket?.remoteAddress || 'unknown';
            await trackApiAuthFailure(keyRecord.partnerId, apiKey.slice(0, 12), ipAddress);
          } catch (trackError) {
            console.error('Failed to track auth failure:', trackError);
          }
        }
        return res.status(401).json({
          error: "Unauthorized",
          message: result.error,
        });
      }
      
      const rateLimit = result.keyRecord!.rateLimit || 100;
      if (!checkRateLimit(result.keyRecord!.id, rateLimit)) {
        return res.status(429).json({
          error: "Too Many Requests",
          message: `Rate limit exceeded. Maximum ${rateLimit} requests per minute.`,
        });
      }
      
      if (requiredPermissions.length > 0) {
        const keyPermissions = (result.keyRecord!.permissions as string[]) || [];
        const hasPermission = requiredPermissions.every((p) =>
          keyPermissions.includes(p)
        );
        
        if (!hasPermission) {
          return res.status(403).json({
            error: "Forbidden",
            message: `API key lacks required permissions: ${requiredPermissions.join(", ")}`,
          });
        }
      }
      
      req.partner = result.partner;
      req.apiKey = result.keyRecord;
      
      // Track API call for suspicious activity detection and new IP access
      try {
        const { trackApiCall } = await import('./security-monitor');
        const { trackNewIpAccess } = await import('./partner-notifications');
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 
                         req.socket?.remoteAddress || 'unknown';
        await Promise.all([
          trackApiCall(result.partner!.id, req.path),
          trackNewIpAccess(result.partner!.id, ipAddress),
        ]);
      } catch (trackError) {
        // Don't block request if tracking fails
        console.error('Failed to track API call:', trackError);
      }
      
      next();
    } catch (error) {
      console.error("Partner auth error:", error);
      return res.status(500).json({
        error: "Internal Server Error",
        message: "Authentication failed",
      });
    }
  };
}

export async function trackUsage(
  partnerId: string,
  apiKeyId: string | null,
  sessionId: string | null,
  eventType: string,
  assessmentType?: string,
  billable: boolean = false,
  billedAmount?: number,
  partnerOrganisationId?: string | null
) {
  try {
    await storage.createUsageEvent({
      partnerId,
      partnerOrganisationId: partnerOrganisationId ?? null,
      apiKeyId,
      sessionId,
      eventType,
      assessmentType,
      billable,
      billedAmount,
    });
  } catch (error) {
    console.error("Failed to track usage event:", error);
  }
}

// Check quota and consume a test credit when an assessment is completed
export async function consumeTestCredit(
  partnerId: string,
  sessionId: string,
  assessmentType: string
): Promise<{ success: boolean; remaining: number; suspended: boolean; shouldNotifyFirst?: boolean; shouldNotifyUrgent?: boolean; shouldAutoTopUp?: boolean }> {
  try {
    const result = await storage.consumePartnerTest(
      partnerId,
      sessionId,
      `Assessment completed: ${assessmentType}`
    );
    
    if (!result.success) {
      return result;
    }
    
    // Check if we need to send notifications
    const partner = await storage.getPartnerAccount(partnerId);
    if (!partner) {
      return result;
    }
    
    const balance = await storage.getPartnerQuotaBalance(partnerId);
    const usagePercentage = balance.testsPurchased > 0 
      ? (balance.testsConsumed / balance.testsPurchased) * 100 
      : 0;
    
    let shouldNotifyFirst = false;
    let shouldNotifyUrgent = false;
    let shouldAutoTopUp = false;
    
    // Use partner's configurable thresholds (default: 80% first, 95% urgent)
    const firstThreshold = partner.quotaAlertThreshold ?? 80;
    const urgentThreshold = Math.min(firstThreshold + 15, 95); // Urgent threshold is 15% above first, max 95%
    
    // Only send notifications if quota alerts are enabled
    if (partner.quotaAlertEnabled !== false) {
      // Check first threshold (configurable, default 80%)
      if (usagePercentage >= firstThreshold && usagePercentage < urgentThreshold && !partner.last70NoticeAt) {
        shouldNotifyFirst = true;
        await storage.updatePartnerQuotaNotification(partnerId, '70'); // Reuse existing field
        
        // Also notify super admins about high API usage
        try {
          const { notifyHighApiUsage } = await import('./security-monitor');
          await notifyHighApiUsage(partnerId, partner.companyName, usagePercentage, balance.remaining, balance.testsPurchased);
        } catch (notifyError) {
          console.error('Failed to notify super admins about high API usage:', notifyError);
        }
      }
      
      // Check urgent threshold (first + 15%, max 95%)
      if (usagePercentage >= urgentThreshold && usagePercentage < 100 && !partner.last90NoticeAt) {
        shouldNotifyUrgent = true;
        await storage.updatePartnerQuotaNotification(partnerId, '90'); // Reuse existing field
        
        // Also notify super admins about critical API usage
        try {
          const { notifyHighApiUsage } = await import('./security-monitor');
          await notifyHighApiUsage(partnerId, partner.companyName, usagePercentage, balance.remaining, balance.testsPurchased);
        } catch (notifyError) {
          console.error('Failed to notify super admins about critical API usage:', notifyError);
        }
      }
    }
    
    // Check if auto top-up should be triggered (for prepaid partners)
    if (partner.billingType === 'prepaid' && partner.autoTopUpEnabled) {
      const autoTopUpThreshold = partner.autoTopUpThreshold ?? 10;
      if (balance.remaining <= autoTopUpThreshold && partner.autoTopUpPackage) {
        shouldAutoTopUp = true;
      }
    }
    
    return { ...result, shouldNotifyFirst, shouldNotifyUrgent, shouldAutoTopUp };
  } catch (error) {
    console.error("Failed to consume test credit:", error);
    return { success: false, remaining: 0, suspended: false };
  }
}

// Get current quota status for a partner
export async function getQuotaStatus(partnerId: string): Promise<{
  testsPurchased: number;
  testsConsumed: number;
  remaining: number;
  usagePercentage: number;
  isSuspended: boolean;
}> {
  const partner = await storage.getPartnerAccount(partnerId);
  const balance = await storage.getPartnerQuotaBalance(partnerId);
  
  const usagePercentage = balance.testsPurchased > 0 
    ? Math.round((balance.testsConsumed / balance.testsPurchased) * 100) 
    : 0;
  
  return {
    ...balance,
    usagePercentage,
    isSuspended: partner?.apiAccessSuspendedAt !== null,
  };
}
