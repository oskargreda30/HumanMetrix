import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import { registerRoutes, startGoldenSetScheduler, startBillingScheduler } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { initializeEmailSystem } from "./email";
import { initializeJobQueues, shutdownJobQueues } from "./queues";
import { apiRateLimiter, authRateLimiter, stripeRateLimiter } from "./middleware/rateLimit";
import { requestDeduplication } from "./middleware/requestDedup";
import { staticCacheHeaders, setSecurityHeaders } from "./middleware/staticCache";
import { configureKeepAlive, keepAliveHeaders } from "./middleware/keepAlive";
import { csrfProtection } from "./middleware/csrf";
import { preloadModules } from "./lazyModules";

const app = express();

const isProduction = process.env.NODE_ENV === 'production';
if (isProduction) {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy enabled for production');
}

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

console.log('✅ Response compression enabled (gzip/deflate)');

app.use(setSecurityHeaders());
app.use(keepAliveHeaders());
app.use(staticCacheHeaders());
console.log('✅ Security headers, keep-alive, and cache headers configured');

app.use('/api/', apiRateLimiter);
app.use('/api/login', authRateLimiter);
app.use('/api/signup', authRateLimiter);
app.use('/api/stripe', stripeRateLimiter);
console.log('✅ API rate limiting enabled');

app.use(requestDeduplication({
  methods: ['POST', 'PUT', 'DELETE'],
  pathPatterns: [/^\/api\//],
}));
console.log('✅ Request deduplication enabled');

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
console.log('✅ CSRF protection enabled');

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
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
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
