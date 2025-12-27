import { storage } from "./storage";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

interface ErrorContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  partnerId?: string;
  partnerName?: string;
  sessionId?: string;
  endpoint?: string;
  httpMethod?: string;
  httpStatus?: number;
  requestBody?: Record<string, any>;
  responseBody?: Record<string, any>;
}

function sanitiseRequestData(data: any): Record<string, any> | null {
  if (!data) return null;
  
  const sensitiveFields = [
    'password', 'passwordHash', 'token', 'apiKey', 'secret',
    'authorization', 'cookie', 'sessionId', 'resetToken',
    'stripeSecretKey', 'stripePaymentIntentId', 'cardNumber',
    'cvv', 'cvc', 'pin', 'ssn', 'socialSecurityNumber'
  ];
  
  const sanitised: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field.toLowerCase()))) {
      sanitised[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitised[key] = sanitiseRequestData(value);
    } else {
      sanitised[key] = value;
    }
  }
  
  return sanitised;
}

function generateFingerprint(error: Error, endpoint?: string): string {
  const content = `${error.name}:${error.message}:${endpoint || 'unknown'}`;
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 16);
}

function getSeverityFromError(error: Error, httpStatus?: number): 'info' | 'warning' | 'error' | 'critical' {
  if (httpStatus && httpStatus >= 500) return 'error';
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) return 'warning';
  
  const errorName = error.name?.toLowerCase() || '';
  if (errorName.includes('critical') || errorName.includes('fatal')) return 'critical';
  if (errorName.includes('validation') || errorName.includes('notfound')) return 'warning';
  
  return 'error';
}

export async function logError(
  error: Error,
  context: ErrorContext = {},
  req?: Request
): Promise<void> {
  try {
    const fingerprint = generateFingerprint(error, context.endpoint);
    
    const existingError = await storage.incrementErrorOccurrence(fingerprint);
    if (existingError) {
      return;
    }
    
    const userAgent = req?.headers['user-agent'] || undefined;
    const ipAddress = req?.ip || req?.headers['x-forwarded-for']?.toString() || undefined;
    const environment = process.env.NODE_ENV || 'development';
    
    await storage.createErrorLog({
      errorMessage: error.message || 'Unknown error',
      errorStack: error.stack || undefined,
      errorType: error.name || 'Error',
      severity: getSeverityFromError(error, context.httpStatus),
      status: 'new',
      endpoint: context.endpoint,
      httpMethod: context.httpMethod,
      httpStatus: context.httpStatus,
      requestBody: sanitiseRequestData(context.requestBody),
      responseBody: sanitiseRequestData(context.responseBody),
      userId: context.userId,
      userEmail: context.userEmail,
      userName: context.userName,
      partnerId: context.partnerId,
      partnerName: context.partnerName,
      sessionId: context.sessionId,
      userAgent,
      ipAddress,
      environment,
      fingerprint,
      occurrenceCount: 1,
      firstOccurredAt: new Date(),
      lastOccurredAt: new Date(),
    });
  } catch (logError) {
    console.error('[ErrorTracker] Failed to log error:', logError);
  }
}

export function errorTrackingMiddleware() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const partner = (req as any).partner;
    
    const context: ErrorContext = {
      endpoint: req.originalUrl || req.url,
      httpMethod: req.method,
      httpStatus: res.statusCode >= 400 ? res.statusCode : 500,
      requestBody: req.body,
      userId: user?.id,
      userEmail: user?.email,
      userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
      partnerId: partner?.id,
      partnerName: partner?.companyName || partner?.name,
    };
    
    logError(err, context, req);
    
    next(err);
  };
}

export function captureRouteError(
  error: Error,
  req: Request,
  additionalContext: Partial<ErrorContext> = {}
): void {
  const user = (req as any).user;
  const partner = (req as any).partner;
  
  const context: ErrorContext = {
    endpoint: req.originalUrl || req.url,
    httpMethod: req.method,
    userId: user?.id,
    userEmail: user?.email,
    userName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
    partnerId: partner?.id,
    partnerName: partner?.companyName || partner?.name,
    ...additionalContext,
  };
  
  logError(error, context, req);
}

export async function logManualError(
  message: string,
  context: ErrorContext & { severity?: 'info' | 'warning' | 'error' | 'critical' } = {}
): Promise<void> {
  const error = new Error(message);
  error.name = context.severity === 'critical' ? 'CriticalError' : 
               context.severity === 'warning' ? 'WarningError' : 'Error';
  await logError(error, context);
}
