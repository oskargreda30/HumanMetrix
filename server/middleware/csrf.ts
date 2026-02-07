import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN_LENGTH = 32;

function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString("hex");
}

export function csrfProtection() {
  return (req: Request, res: Response, next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === "production";
    
    let csrfToken = req.cookies?.[CSRF_COOKIE_NAME];
    
    if (!csrfToken) {
      csrfToken = generateToken();
      res.cookie(CSRF_COOKIE_NAME, csrfToken, {
        httpOnly: false,
        secure: true,
        sameSite: "none",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    }
    
    (req as any).csrfToken = csrfToken;
    
    const isStateChangingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    
    const exemptPaths = [
      // Authentication endpoints (public)
      "/api/login",
      "/api/signup",
      "/api/logout",
      "/api/request-password-reset",
      "/api/reset-password",
      "/api/auth/auto-login",
      
      // Public contact/enquiry forms
      "/api/contact",
      "/api/general-enquiry",
      "/api/enterprise-enquiry",
      
      // Invitation flows (public/guest)
      "/api/invite/",
      "/api/guest/invite/",
      "/api/create-free-invitation",
      
      // Payment/checkout flows (public)
      "/api/process-results-payment",
      "/api/unlock-results/checkout",
      "/api/unlock-results/process-payment",
      "/api/b2b/results/",
      "/api/b2b/results-bundle/checkout",
      "/api/b2b/results-bundle/process-payment",
      "/api/b2b/process-payment",
      
      // Webhooks and callbacks (external services)
      "/api/stripe/webhook",
      "/api/partner/package/callback",
      "/api/partner/package/airwallex-callback",
      
      // Partner API sessions (uses API key auth)
      "/api/partner/sessions",
      "/api/partner/sessions/",
      
      // Embed API (uses session token)
      "/api/embed/session/",
      
      // File uploads (uses session auth)
      "/api/uploads/request-url",
    ];
    
    // Special handling for assessment abandon - uses sendBeacon which can't set headers
    // Check for /api/assessments/:id/abandon pattern specifically
    const isAbandonEndpoint = req.method === 'POST' && /^\/api\/assessments\/[^/]+\/abandon$/.test(req.path);
    
    const isExempt = exemptPaths.some(path => {
      if (path.endsWith("/")) {
        return req.path.startsWith(path) || req.path === path.slice(0, -1);
      }
      return req.path === path || req.path.startsWith(path + "/");
    });
    
    const hasApiKey = req.headers["x-api-key"] || req.headers["authorization"];
    
    if (isStateChangingMethod && !isExempt && !hasApiKey && !isAbandonEndpoint) {
      const headerToken = req.headers[CSRF_HEADER_NAME] as string;
      const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
      
      if (!headerToken || !cookieToken || headerToken !== cookieToken) {
        console.warn(`[CSRF] Token mismatch on ${req.method} ${req.path} - header: ${headerToken ? 'present' : 'missing'}, cookie: ${cookieToken ? 'present' : 'missing'}, match: ${headerToken === cookieToken}`);
        return res.status(403).json({ 
          message: "Invalid or missing CSRF token",
          code: "CSRF_VALIDATION_FAILED"
        });
      }
    }
    
    next();
  };
}

export function getCsrfToken(req: Request): string {
  return (req as any).csrfToken || "";
}
