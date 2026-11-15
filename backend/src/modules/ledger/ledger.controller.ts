import type { RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import { getTenantContext } from '../../middleware/auth.middleware';
import type { LedgerService } from './ledger.service';
import type { TenantContext } from './ledger.types';
import {
  createTransactionSchema,
  idempotencyKeySchema,
  listQuerySchema,
  summaryQuerySchema,
  transactionIdParamSchema,
} from './ledger.validation';

export interface LedgerControllerDeps {
  service: LedgerService;
  /** Week 1 / Person 2: getTenantConnection(tenantId). Injected so tests can use a throwaway DB. */
  getConnection: (tenantId: string) => Promise<Connection>;
}

export interface LedgerController {
  createTransaction: RequestHandler;
  listTransactions: RequestHandler;
  getTransaction: RequestHandler;
  getSummary: RequestHandler;
}

export function createLedgerController({ service, getConnection }: LedgerControllerDeps): LedgerController {
  /** tenantId comes ONLY from the verified JWT (requireAuth), never from the request. */
  async function tenantContext(req: Parameters<RequestHandler>[0]): Promise<TenantContext> {
    const { tenantId, userId } = getTenantContext(req);
    return { tenantId, userId, connection: await getConnection(tenantId) };
  }

  return {
    createTransaction: async (req, res, next) => {
      try {
        const input = createTransactionSchema.parse(req.body);
        const key = idempotencyKeySchema.parse(req.header('Idempotency-Key'));
        const ctx = await tenantContext(req);
        const { transaction, replayed } = await service.createTransaction(ctx, input, key);
        res.setHeader('Idempotent-Replayed', String(replayed));
        res.status(replayed ? 200 : 201).json({
          success: true,
          message: replayed ? 'Transaction already completed' : 'Transaction completed',
          data: transaction,
        });
      } catch (err) {
        next(err);
      }
    },

    listTransactions: async (req, res, next) => {
      try {
        const query = listQuerySchema.parse(req.query);
        const data = await service.listTransactions(await tenantContext(req), query);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },

    getTransaction: async (req, res, next) => {
      try {
        const { id } = transactionIdParamSchema.parse(req.params);
        const data = await service.getTransaction(await tenantContext(req), id);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },

    getSummary: async (req, res, next) => {
      try {
        const { currency } = summaryQuerySchema.parse(req.query);
        const data = await service.getSummary(await tenantContext(req), currency);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  };
}
