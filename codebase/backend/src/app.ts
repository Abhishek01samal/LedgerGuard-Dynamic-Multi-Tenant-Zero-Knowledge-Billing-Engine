import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import authRoutes from './modules/auth/auth.routes';
import healthRoutes from './modules/health/health.routes';
import ledgerRoutes from './modules/ledger/ledger.routes';
import tenantRoutes from './modules/tenants/tenant.routes';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.frontendUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.use('/health', healthRoutes);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/tenants', tenantRoutes);
  app.use('/api/v1/ledger', ledgerRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
