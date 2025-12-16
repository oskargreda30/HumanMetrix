type PendingRequest = {
  promise: Promise<any>;
  timestamp: number;
};

const pendingRequests = new Map<string, PendingRequest>();

const DEDUP_WINDOW_MS = 500;
const CLEANUP_INTERVAL_MS = 10000;

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(pendingRequests.entries());
  for (const [key, pending] of entries) {
    if (now - pending.timestamp > DEDUP_WINDOW_MS * 2) {
      pendingRequests.delete(key);
    }
  }
}, CLEANUP_INTERVAL_MS);

function generateRequestKey(req: any): string {
  const userId = req.user?.id || 'anonymous';
  const method = req.method;
  const path = req.path;
  const body = req.method === 'POST' || req.method === 'PUT' 
    ? JSON.stringify(req.body || {}).substring(0, 200)
    : '';
  
  return `${userId}:${method}:${path}:${body}`;
}

export function requestDeduplication(options: { 
  methods?: string[];
  pathPatterns?: RegExp[];
} = {}) {
  const { 
    methods = ['POST', 'PUT', 'DELETE'],
    pathPatterns = [/^\/api\//]
  } = options;

  return (req: any, res: any, next: any) => {
    if (!methods.includes(req.method)) {
      return next();
    }

    const matchesPattern = pathPatterns.some(pattern => pattern.test(req.path));
    if (!matchesPattern) {
      return next();
    }

    const key = generateRequestKey(req);
    const now = Date.now();

    const pending = pendingRequests.get(key);
    if (pending && (now - pending.timestamp) < DEDUP_WINDOW_MS) {
      console.log(`🔄 Duplicate request detected: ${req.method} ${req.path}`);
      res.status(429).json({ 
        message: 'Duplicate request detected. Please wait.',
        retryAfter: Math.ceil((DEDUP_WINDOW_MS - (now - pending.timestamp)) / 1000)
      });
      return;
    }

    const originalEnd = res.end;
    const originalJson = res.json;

    let responsePromiseResolve: (value: any) => void;
    const responsePromise = new Promise<any>((resolve) => {
      responsePromiseResolve = resolve;
    });

    pendingRequests.set(key, {
      promise: responsePromise,
      timestamp: now,
    });

    res.end = function(...args: any[]) {
      pendingRequests.delete(key);
      responsePromiseResolve({ status: res.statusCode });
      return originalEnd.apply(res, args);
    };

    res.json = function(body: any) {
      pendingRequests.delete(key);
      responsePromiseResolve({ status: res.statusCode, body });
      return originalJson.call(res, body);
    };

    next();
  };
}

export function getDeduplicationStats() {
  return {
    pendingCount: pendingRequests.size,
    entries: Array.from(pendingRequests.entries()).map(([key, pending]) => ({
      key: key.substring(0, 50) + '...',
      age: Date.now() - pending.timestamp,
    })),
  };
}
