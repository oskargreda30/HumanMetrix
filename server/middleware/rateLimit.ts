// ARCHITECTURE NOTE — In-Memory Rate Limiting
// ============================================
// All rate limiters in this file (and the authAttempts Map in server/auth.ts and
// the rateLimitMap in server/partner-auth.ts) use plain JavaScript Map objects stored
// in process memory.
//
// Known limitations:
//   1. State is lost on every server restart — counters reset to zero.
//   2. State is NOT shared across processes or instances — a multi-process deployment
//      (cluster mode, multiple Replit Deployments replicas, etc.) means each process
//      maintains its own independent counter, effectively multiplying the allowed
//      request rate by the number of running instances.
//
// This is acceptable for the current single-process deployment but must be addressed
// before horizontal scaling.
//
// Recommended upgrade path (Redis-backed rate limiting):
//   • Replace this Map with a Redis client (e.g. ioredis) using atomic INCR + EXPIRE.
//   • A drop-in wrapper like `rate-limiter-flexible` (npm) supports Redis out of the
//     box with the same interface shape used here.
//   • The Redis connection string should be stored in the REDIS_URL environment secret.
//   • All three rate-limit stores (rateLimit.ts, auth.ts authAttempts,
//     partner-auth.ts rateLimitMap) must be migrated together for consistency.
//
// Until the Redis migration is complete, the in-memory stores are a known and
// documented architectural limitation, not a silent bug.

type RateLimitEntry = {
  count: number;
  resetTime: number;
};

type RateLimitConfig = {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyGenerator?: (req: any) => string;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(rateLimitStore.entries());
  for (const [key, entry] of entries) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

export function createRateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later.',
    keyGenerator = (req) => {
      const forwarded = req.headers?.['x-forwarded-for'];
      const clientIp = forwarded ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0]) : null;
      return clientIp || req.ip || req.connection?.remoteAddress || 'unknown';
    },
  } = config;

  return (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({ message });
      return;
    }

    next();
  };
}

export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 100,
  message: 'Too many API requests. Please wait a moment.',
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 25,
  message: 'Too many login attempts. Please try again later.',
});

export const assessmentRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Assessment submission rate exceeded.',
});

export const stripeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: 'Payment processing rate exceeded.',
});

export function getRateLimitStats() {
  return {
    entriesCount: rateLimitStore.size,
    entries: Array.from(rateLimitStore.entries()).map(([key, entry]) => ({
      key: key.substring(0, 20) + '...',
      count: entry.count,
      resetsIn: Math.max(0, entry.resetTime - Date.now()),
    })),
  };
}
