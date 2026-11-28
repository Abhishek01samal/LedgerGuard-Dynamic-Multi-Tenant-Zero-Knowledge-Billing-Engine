import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { env } from './config/env';
import { securityConfig } from './config/security.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requireAuth } from './middleware/auth.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { requestLoggingMiddleware } from './middleware/request-logging.middleware';
import { requireRequestSignature } from './middleware/signature.middleware';
import analyticsRoutes from './modules/analytics/analytics.routes';
import authRoutes from './modules/auth/auth.routes';
import ledgerRoutes from './modules/ledger/ledger.routes';
import loggingRoutes from './modules/logging/logging.routes';
import securityRoutes from './modules/security/security.routes';
import usageRoutes from './modules/usage/usage.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(requestIdMiddleware);
  app.use(express.json({ limit: securityConfig.bodyLimit }));
  app.use(cookieParser());
  app.use(requestLoggingMiddleware);

  const loginLimiter = rateLimit({
    windowMs: securityConfig.loginWindowMs,
    max: securityConfig.loginMax,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, ip: false },
    message: { success: false, message: 'Too many login attempts', code: 'RATE_LIMITED' },
  });
  const apiLimiter = rateLimit({
    windowMs: securityConfig.apiWindowMs,
    max: securityConfig.apiMax,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { xForwardedForHeader: false, ip: false },
  });

  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'LedgerGuard API is running' });
  });

  app.use('/api/v1/auth/login', loginLimiter);
  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/ledger', requireAuth, requireRequestSignature, ledgerRoutes);
  app.use('/api/v1/analytics', requireAuth, analyticsRoutes);
  app.use('/api/v1/usage', requireAuth, usageRoutes);
  app.use('/api/v1/security', requireAuth, securityRoutes);
  app.use('/api/v1/logs', requireAuth, loggingRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
