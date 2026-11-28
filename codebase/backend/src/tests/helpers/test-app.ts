// backend/src/tests/helpers/test-app.ts
// Minimal Express app that mounts the REAL analytics router behind a FAKE tenant middleware.
// Header `x-test-tenant: company_A` plays the role of "verified JWT for company_A".
// The real JWT chain is covered separately in analytics-isolation.test.ts (ADAPT section).
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Connection } from 'mongoose';
import analyticsRoutes from '../../modules/analytics/analytics.routes';

type TenantRequest = Request & {
  tenantId: string;
  tenantConnection: Connection;
};

export function buildTestApp(
  connections: Record<string, Connection>,
  extraRouters: Array<[string, express.Router]> = [],
) {
  const app = express();
  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const t = req.header('x-test-tenant');
    if (!t || !connections[t]) {
      return res.status(401).json({ success: false, error: { message: 'Unauthenticated' } });
    }
    const tenantReq = req as TenantRequest;
    tenantReq.tenantId = t;
    tenantReq.tenantConnection = connections[t];
    return next();
  });

  app.use('/api/v1/analytics', analyticsRoutes);
  for (const [path, router] of extraRouters) app.use(path, router);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number'
        ? err.status
        : 500;
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return res.status(status).json({ success: false, error: { message } });
  });
  return app;
}
