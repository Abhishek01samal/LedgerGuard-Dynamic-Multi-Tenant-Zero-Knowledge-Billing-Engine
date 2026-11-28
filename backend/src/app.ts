import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requireAuth } from './middleware/auth.middleware';
import analyticsRoutes from './modules/analytics/analytics.routes';
import authRoutes from './modules/auth/auth.routes';
import ledgerRoutes from './modules/ledger/ledger.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // TODO(Person 4): replace with `app.use('/health', healthRoutes)` from modules/health.
  app.get('/health', (_req, res) => {
    res.json({ success: true, message: 'LedgerGuard API is running' });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/ledger', requireAuth, ledgerRoutes);
  app.use('/api/v1/analytics', requireAuth, analyticsRoutes);

  // TODO(Person 2/4): mount tenant routes once available, e.g.
  // app.use('/api/v1/tenants', requireAuth, tenantRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
