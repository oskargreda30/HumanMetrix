import { Request, Response, NextFunction } from 'express';
import { Server } from 'http';

export function configureKeepAlive(server: Server) {
  server.keepAliveTimeout = 65000;
  
  server.headersTimeout = 66000;
  
  console.log('✅ HTTP Keep-Alive configured (timeout: 65s)');
}

export function keepAliveHeaders() {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Keep-Alive', 'timeout=65, max=1000');
    next();
  };
}
