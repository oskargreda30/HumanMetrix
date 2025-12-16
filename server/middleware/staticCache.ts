import { Request, Response, NextFunction } from 'express';

const IMMUTABLE_EXTENSIONS = [
  '.js', '.css', '.woff', '.woff2', '.ttf', '.eot', 
  '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'
];

const CACHE_DURATIONS = {
  immutable: 31536000,
  static: 86400,
  html: 0,
  api: 0,
};

export function staticCacheHeaders() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      return next();
    }

    if (req.path.endsWith('.html') || req.path === '/') {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      return next();
    }

    const hasHash = /\.[a-f0-9]{8,}\.(js|css|woff2?|ttf|eot)$/i.test(req.path);
    
    if (hasHash) {
      res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATIONS.immutable}, immutable`);
      return next();
    }

    const isImmutableType = IMMUTABLE_EXTENSIONS.some(ext => 
      req.path.toLowerCase().endsWith(ext)
    );

    if (isImmutableType) {
      res.setHeader('Cache-Control', `public, max-age=${CACHE_DURATIONS.static}`);
      return next();
    }

    next();
  };
}

export function setSecurityHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  };
}
