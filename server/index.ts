import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes, startBillingScheduler, startDatabaseSizeScheduler } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeEmailSystem } from "./email";
import { initializeJobQueues, shutdownJobQueues } from "./queues";
import { apiRateLimiter, stripeRateLimiter } from "./middleware/rateLimit";
import { requestDeduplication } from "./middleware/requestDedup";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { staticCacheHeaders, setSecurityHeaders } from "./middleware/staticCache";
import { configureKeepAlive, keepAliveHeaders } from "./middleware/keepAlive";
import { csrfProtection } from "./middleware/csrf";
import { preloadModules } from "./lazyModules";
import { seedCustomRoles } from "./seed-custom-roles";

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

// Trailing slash redirect middleware - remove trailing slashes for canonical URLs
// Exception: Root path "/" and API routes
app.use((req, res, next) => {
  const path = req.path;
  
  // Skip API routes and root path
  if (path === '/' || path.startsWith('/api/')) {
    return next();
  }
  
  // Redirect paths with trailing slashes to non-trailing slash versions
  if (path.length > 1 && path.endsWith('/')) {
    const query = req.url.slice(path.length);
    const safePath = path.slice(0, -1);
    return res.redirect(301, safePath + query);
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
  limit: '50mb', // Increased for PDF screen capture uploads
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
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
    
    const errMsg = (err.message || '').toLowerCase();
    const isDbPoolError = errMsg.includes('too many database connection') ||
      errMsg.includes('failed to acquire permit') ||
      errMsg.includes('connection pool') ||
      errMsg.includes('terminating connection due to administrator command') ||
      errMsg.includes('connection terminated unexpectedly');

    if (!isDbPoolError) {
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
    }

    res.status(status).json({ message });
    
    console.error('[Global Error Handler]', err);
  });

  // SEO prerender middleware for bots / AI crawlers - serves rich static
  // HTML to user-agents like GPTBot, ChatGPT-User, ClaudeBot, PerplexityBot,
  // Googlebot, etc. so they can read site content despite the SPA.
  const { registerSeoPrerender } = await import("./seo-prerender");
  registerSeoPrerender(app);

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
  
  const onListening = () => {
    log(`serving on port ${port}`);
    
    // Initialize job queues for background processing
    initializeJobQueues();
    
    // Initialize email system after server starts
    initializeEmailSystem();
    
    // AI spending is shut off: no automated scoring checks or insight backfills.
    console.log('[AI] All provider calls and automatic AI jobs are disabled.');
    
    // Start billing scheduler for auto-bill partner charges
    startBillingScheduler();
    
    // Start database size monitoring scheduler
    startDatabaseSizeScheduler();
    
    
    // Preload heavy modules in production
    preloadModules();

    // Seed custom job roles (JD-sourced roles) into any environment that doesn't have them yet
    seedCustomRoles().catch(err => {
      console.error('[CustomRoles] Unhandled error:', err.message);
    });

  };

  // Resilient startup. During a restart the previous process may still be
  // releasing port 5000 for a brief moment. Instead of letting the unhandled
  // 'error' event crash the workflow (the EADDRINUSE failure), we retry binding
  // for a short window so the server reliably comes up once the old process exits.
  const MAX_LISTEN_RETRIES = 20;
  const LISTEN_RETRY_DELAY_MS = 1000;
  let listenRetries = 0;
  let retryTimer: NodeJS.Timeout | null = null;
  let shuttingDown = false;

  const startListening = () => {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    });
  };

  server.once('listening', onListening);

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (shuttingDown) return; // don't fight for the port while we're exiting
    if (err.code === 'EADDRINUSE') {
      if (listenRetries < MAX_LISTEN_RETRIES) {
        listenRetries++;
        console.warn(
          `Port ${port} is in use (EADDRINUSE). A previous process may still be shutting down. ` +
          `Retrying ${listenRetries}/${MAX_LISTEN_RETRIES} in ${LISTEN_RETRY_DELAY_MS}ms...`
        );
        retryTimer = setTimeout(startListening, LISTEN_RETRY_DELAY_MS);
      } else {
        console.error(`Port ${port} still in use after ${MAX_LISTEN_RETRIES} retries. Exiting.`);
        process.exit(1);
      }
    } else {
      console.error('Fatal server error:', err);
      process.exit(1);
    }
  });

  startListening();

  // Graceful shutdown handling. The priority is to release port 5000 quickly so
  // the next start never hits EADDRINUSE. A lingering process holding the port is
  // the root cause of that failure, so we drop idle keep-alive connections
  // immediately and keep a short hard-timeout that always exits the process.
  const gracefulShutdown = async (signal: string) => {
    if (shuttingDown) return; // ignore repeated signals
    shuttingDown = true;
    console.log(`\n${signal} received. Starting graceful shutdown...`);

    // Stop any pending listen retry so it can't re-bind the port mid-shutdown.
    if (retryTimer) clearTimeout(retryTimer);

    // Hard safety net: always exit (and free the port) even if close/queues hang.
    // unref() so this timer never keeps the process alive on its own.
    const forceExit = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit to release the port.');
      process.exit(0);
    }, 8000);
    forceExit.unref();

    server.close(async () => {
      console.log('HTTP server closed');
      try {
        await shutdownJobQueues();
        console.log('All queues shut down');
      } catch (error) {
        console.error('Error during shutdown:', error);
      } finally {
        clearTimeout(forceExit);
        process.exit(0);
      }
    });

    // Drop idle keep-alive connections (65s timeout) immediately so server.close()
    // resolves promptly. In-flight requests are left to finish and are backstopped
    // by the 8s force-exit above, so we never block port release indefinitely.
    const closeIdleConnections = (server as unknown as { closeIdleConnections?: () => void }).closeIdleConnections;
    if (typeof closeIdleConnections === 'function') {
      closeIdleConnections.call(server);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
