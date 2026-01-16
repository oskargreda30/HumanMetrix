import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes, startGoldenSetScheduler, startBillingScheduler, startDatabaseSizeScheduler } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeEmailSystem } from "./email";
import { initializeJobQueues, shutdownJobQueues } from "./queues";
import { apiRateLimiter, authRateLimiter, stripeRateLimiter } from "./middleware/rateLimit";
import { requestDeduplication } from "./middleware/requestDedup";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { staticCacheHeaders, setSecurityHeaders } from "./middleware/staticCache";
import { configureKeepAlive, keepAliveHeaders } from "./middleware/keepAlive";
import { csrfProtection } from "./middleware/csrf";
import { preloadModules } from "./lazyModules";

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

function devLog(message: string) {
  if (!isProduction) {
    console.log(message);
  }
}

if (isProduction) {
  app.set('trust proxy', 1);
}

// Domain redirect middleware - redirect all domains to primary domain
const PRIMARY_DOMAIN = 'www.humanmetrix.co.uk';
const REDIRECT_DOMAINS = ['www.humanmetrix-ai.com', 'humanmetrix-ai.com', 'www.humanmetrixai.com', 'humanmetrixai.com', 'humanmetrix.co.uk'];

app.use((req, res, next) => {
  const host = req.get('host')?.toLowerCase();
  
  // Only redirect in production and for actual domain requests
  if (isProduction && host && REDIRECT_DOMAINS.includes(host)) {
    const redirectUrl = `https://${PRIMARY_DOMAIN}${req.originalUrl}`;
    return res.redirect(301, redirectUrl);
  }
  
  next();
});

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

devLog('✅ Response compression enabled (gzip/deflate)');

app.use(setSecurityHeaders());
app.use(keepAliveHeaders());
app.use(staticCacheHeaders());
devLog('✅ Security headers, keep-alive, and cache headers configured');

app.use('/api/', apiRateLimiter);
app.use('/api/login', authRateLimiter);
app.use('/api/signup', authRateLimiter);
app.use('/api/stripe', stripeRateLimiter);
devLog('✅ API rate limiting enabled');

app.use(requestDeduplication({
  methods: ['POST', 'PUT', 'DELETE'],
  pathPatterns: [/^\/api\//],
}));
devLog('✅ Request deduplication enabled');

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(csrfProtection());
devLog('✅ CSRF protection enabled');

const SENSITIVE_FIELDS = new Set([
  'password', 'passwordhash', 'email', 'firstname', 'lastname', 
  'apikey', 'secretkey', 'token', 'accesstoken', 'refreshtoken',
  'ssn', 'phonenumber', 'address', 'dateofbirth', 'creditcard',
  'stripeCustomerId'.toLowerCase(), 'profileimageurl'
]);

function sanitizeForLogging(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.length > 3 ? `[Array(${obj.length})]` : obj.map(sanitizeForLogging);
  }
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      
      if (!isProduction && capturedJsonResponse) {
        const sanitized = sanitizeForLogging(capturedJsonResponse);
        const jsonStr = JSON.stringify(sanitized);
        if (jsonStr.length <= 100) {
          logLine += ` :: ${jsonStr}`;
        }
      }

      if (logLine.length > 120) {
        logLine = logLine.slice(0, 119) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Register object storage routes for file uploads
  registerObjectStorageRoutes(app);
  
  const server = await registerRoutes(app);

  // Global error handler - catches all unhandled errors and notifies super admins
  app.use(async (err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Notify super admins of all errors (critical notification system)
    try {
      const { notifyCriticalError } = await import('./email');
      await notifyCriticalError({
        source: 'Global Error Handler',
        error: err,
        requestPath: req.path,
        requestMethod: req.method,
        userId: (req as any).user?.id,
        additionalContext: {
          statusCode: status,
          query: JSON.stringify(req.query || {}),
          userAgent: req.get('user-agent'),
        },
      });
    } catch (notifyError: any) {
      console.error('[Global Error Handler] Failed to send critical error notification:', notifyError.message);
    }

    res.status(status).json({ message });
    
    // Log the error for debugging
    console.error('[Global Error Handler]', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  configureKeepAlive(server);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Initialize job queues for background processing
    initializeJobQueues();
    
    // Initialize email system after server starts
    initializeEmailSystem();
    
    // Start Golden Set scheduler for daily GPT-4o scoring consistency checks
    startGoldenSetScheduler();
    
    // Start billing scheduler for auto-bill partner charges
    startBillingScheduler();
    
    // Start database size monitoring scheduler
    startDatabaseSizeScheduler();
    
    // Preload heavy modules in production
    preloadModules();
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await shutdownJobQueues();
        console.log('All queues shut down');
        process.exit(0);
      } catch (error) {
        console.error('Error during shutdown:', error);
        process.exit(1);
      }
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      console.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
