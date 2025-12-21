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
  apiKeyId: string,
  sessionId: string | null,
  eventType: string,
  assessmentType?: string,
  billable: boolean = false,
  billedAmount?: number
) {
  try {
    await storage.createUsageEvent({
      partnerId,
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
