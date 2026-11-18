import type { RequestHandler } from 'express';
import { getTenantContext } from '../../middleware/auth.middleware';
import { AppError } from '../../middleware/error.middleware';
import {
  IDEMPOTENCY_HEADER,
  LEDGER_ERROR_CODES,
  LEDGER_STATUS,
  REPLAY_HEADER,
} from '../../../../shared/contracts/ledger.contract';
import { createTransaction, getSummary, getTransaction, listTransactions } from './ledger.service';
import { createTransactionSchema, positiveInt } from './ledger.validation';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * POST /api/v1/ledger/transactions
 * Order: body validation -> Idempotency-Key presence -> key == body.eventId -> lock/idempotency flow.
 * Authentication happened in requireAuth, before any idempotency work.
 */
export const createTransactionHandler: RequestHandler = async (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const body = createTransactionSchema.parse(req.body);

    const key = req.get(IDEMPOTENCY_HEADER);
    if (!key) {
      throw new AppError(
        LEDGER_STATUS.validation,
        `${IDEMPOTENCY_HEADER} header is required`,
        LEDGER_ERROR_CODES.idempotencyKeyRequired,
      );
    }
    if (key !== body.eventId) {
      throw new AppError(
        LEDGER_STATUS.validation,
        `${IDEMPOTENCY_HEADER} must match the body eventId`,
        LEDGER_ERROR_CODES.idempotencyKeyMismatch,
      );
    }

    const result = await createTransaction(tenantId, body);
    if (result.replayed) res.set(REPLAY_HEADER, 'true');
    res.status(result.replayed ? LEDGER_STATUS.replayed : LEDGER_STATUS.created).json({
      success: true,
      message: 'Transaction completed',
      data: result.data,
    });
  } catch (err) {
    next(err);
  }
};

/** GET /api/v1/ledger/transactions - tenant-scoped, newest first. */
export const listTransactionsHandler: RequestHandler = async (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const page = positiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(positiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const result = await listTransactions(tenantId, page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/** GET /api/v1/ledger/transactions/:id - 404 for other tenants' ids, never 403. */
export const getTransactionHandler: RequestHandler = async (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const { id } = req.params;
    if (!id) {
      throw new AppError(
        LEDGER_STATUS.notFound,
        'Transaction not found',
        LEDGER_ERROR_CODES.transactionNotFound,
      );
    }
    const data = await getTransaction(tenantId, id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/** GET /api/v1/ledger/summary - totals over the tenant's own transactions. */
export const summaryHandler: RequestHandler = async (req, res, next) => {
  try {
    const { tenantId } = getTenantContext(req);
    const data = await getSummary(tenantId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
