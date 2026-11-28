import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

declare module 'express-serve-static-core' {
  interface Locals {
    traceId?: string;
  }
}

export const requestIdMiddleware: RequestHandler = (req, res, next) => {
  const incoming = req.header('X-Request-ID');
  const traceId = incoming && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : randomUUID();
  res.locals.traceId = traceId;
  res.setHeader('X-Request-ID', traceId);
  next();
};
