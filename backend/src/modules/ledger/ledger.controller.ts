import type { RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../../middleware/error.middleware';
import { getTenantContext } from '../../middleware/auth.middleware';
import { recordAudit } from '../../services/audit.service';
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
      const started = Date.now();
      const traceId = res.locals.traceId ?? 'unknown';
      let ctx: TenantContext | null = null;
      let transactionId: string | null = null;
      try {
        const input = createTransactionSchema.parse(req.body);
        const key = idempotencyKeySchema.parse(req.header('Idempotency-Key'));
        ctx = await tenantContext(req);
        void recordAudit({
          traceId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          event: 'TRANSACTION_STARTED',
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: 202,
          durationMs: 0,
          message: input.eventId,
        });
        const { transaction, replayed } = await service.createTransaction(ctx, input, key);
        transactionId = transaction.transactionId;
        void recordAudit({
          traceId,
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          event: replayed ? 'TRANSACTION_REPLAYED' : 'TRANSACTION_COMPLETED',
          transactionId,
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: replayed ? 200 : 201,
          durationMs: Date.now() - started,
        });
        res.setHeader('Idempotent-Replayed', String(replayed));
        res.status(replayed ? 200 : 201).json({
          success: true,
          message: replayed ? 'Transaction already completed' : 'Transaction completed',
          data: transaction,
        });
      } catch (err) {
        if (err instanceof AppError && err.data && typeof err.data === 'object' && 'transactionId' in err.data) {
          transactionId = (err.data as { transactionId: string | null }).transactionId;
        }
        void recordAudit({
          traceId,
          tenantId: ctx?.tenantId ?? null,
          userId: ctx?.userId ?? null,
          event: 'TRANSACTION_FAILED',
          transactionId,
          method: req.method,
          endpoint: req.originalUrl,
          statusCode: err instanceof AppError ? err.statusCode : err instanceof ZodError ? 400 : 500,
          durationMs: Date.now() - started,
          message:
            err instanceof AppError ? err.code : err instanceof ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        });
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
