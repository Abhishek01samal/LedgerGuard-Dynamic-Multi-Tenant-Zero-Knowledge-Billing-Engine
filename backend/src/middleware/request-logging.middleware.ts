import type { RequestHandler } from 'express';
import { logger, recordAudit } from '../services/audit.service';

export const requestLoggingMiddleware: RequestHandler = (req, res, next) => {
  const started = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - started;
    const tenantId = req.auth?.tenantId ?? null;
    const payload = {
      traceId: res.locals.traceId ?? 'unknown',
      tenantId,
      userId: req.auth?.sub ?? null,
      event: 'REQUEST' as const,
      method: req.method,
      endpoint: req.originalUrl.split('?')[0] ?? req.path,
      statusCode: res.statusCode,
      durationMs,
    };
    logger.info('request', payload);
    if (tenantId && req.originalUrl.startsWith('/api/v1/ledger')) {
      void recordAudit(payload);
    }
  });
  next();
};
