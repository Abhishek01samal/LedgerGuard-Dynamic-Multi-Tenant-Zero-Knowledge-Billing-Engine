import { Router } from 'express';
import { getTenantConnection } from '../../database/tenant.connection';
import { createLedgerController, type LedgerControllerDeps } from './ledger.controller';
import { LedgerService } from './ledger.service';

/** Factory so tests can inject a service and a throwaway database. */
export function createLedgerRouter(deps: LedgerControllerDeps): Router {
  const controller = createLedgerController(deps);
  const router = Router();

  // Mounted at /api/v1/ledger behind requireAuth (see app.ts).
  router.post('/transactions', controller.createTransaction);
  router.get('/transactions', controller.listTransactions);
  router.get('/transactions/:id', controller.getTransaction);
  router.get('/summary', controller.getSummary);
  return router;
}

export default createLedgerRouter({
  service: new LedgerService(),
  getConnection: getTenantConnection,
});
