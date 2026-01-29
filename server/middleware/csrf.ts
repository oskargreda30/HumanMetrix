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
        secure: isProduction,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
      });
    }
    
    (req as any).csrfToken = csrfToken;
    
    const isStateChangingMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);
    
    const exemptPaths = [
      "/api/login",
      "/api/signup",
      "/api/create-free-invitation",
      "/api/process-results-payment",
      "/api/stripe/webhook",
      "/api/partner/sessions",
      "/api/partner/sessions/",
      "/api/embed/session/",
      "/api/partner/package/callback",
      "/api/b2b/results/",
      "/api/b2b/process-payment",
      "/api/guest/invite/",
      "/api/invite/",
    ];
    
    const isExempt = exemptPaths.some(path => {
      if (path.endsWith("/")) {
        return req.path.startsWith(path) || req.path === path.slice(0, -1);
      }
      return req.path === path || req.path.startsWith(path + "/");
    });
    
    const hasApiKey = req.headers["x-api-key"] || req.headers["authorization"];
    
    if (isStateChangingMethod && !isExempt && !hasApiKey) {
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
