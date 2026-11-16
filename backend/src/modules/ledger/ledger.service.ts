import { AppError } from '../../middleware/error.middleware';
import { getLedgerModels, type LedgerModels } from './ledger.model';
import { getIdempotencyGuard } from './ledger.guard';
import {
  idempotencyKeyMismatch,
  idempotencyKeyReused,
  LockUnavailableError,
  transactionInProgress,
} from './ledger.errors';
import { hashPayload, normalizePayload, toCreateResponse, type NormalizedPayload } from './ledger.mapper';
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
  IdempotencyGuard,
  LedgerSummary,
  ListTransactionsQuery,
  LedgerTransactionDoc,
  PaginatedTransactions,
  TenantContext,
  TransactionDetailView,
} from './ledger.types';

export interface LedgerServiceOptions {
  /** Defaults to the registered guard (in-memory until Person 2 registers Redis). */
  guard?: IdempotencyGuard;
}

export interface CreateOutcome {
  transaction: CreateTransactionResponse;
  replayed: boolean;
}

const notImplemented = (what: string): AppError =>
  new AppError(501, `${what} is not implemented yet`, 'NOT_IMPLEMENTED');

export class LedgerService {
  constructor(private readonly options: LedgerServiceOptions = {}) {}

  /** Resolved per call so a guard registered after startup is picked up. */
  private get guard(): IdempotencyGuard {
    return this.options.guard ?? getIdempotencyGuard();
  }

  protected async models(ctx: TenantContext): Promise<LedgerModels> {
    const models = getLedgerModels(ctx.connection);
    // Make sure the unique indexes exist BEFORE the first write.
    await Promise.all([models.Transaction.init(), models.Entry.init()]);
    return models;
  }

  async createTransaction(
    ctx: TenantContext,
    input: CreateTransactionInput,
    idempotencyKey: string,
  ): Promise<CreateOutcome> {
    if (idempotencyKey !== input.eventId) throw idempotencyKeyMismatch();

    const payload = normalizePayload(input);
    const payloadHash = hashPayload(payload);
    const models = await this.models(ctx);

    try {
      return await this.guard.runExclusive(`${ctx.tenantId}:${input.eventId}`, async () => {
        const existing = await models.Transaction.findOne({ tenantId: ctx.tenantId, eventId: input.eventId }).lean();
        if (existing) {
          const decided = this.interpretExisting(existing, payloadHash);
          if (decided) return decided;
          // FAILED earlier with the same payload: retrying with the same key is allowed.
          return this.processNew(ctx, models, payload, payloadHash, existing.transactionId);
        }
        return this.processNew(ctx, models, payload, payloadHash, null);
      });
    } catch (err) {
      if (err instanceof LockUnavailableError) throw transactionInProgress();
      throw err;
    }
  }

  /**
   * Decide what an already-stored event means for this request.
   * Returns an outcome to send back, throws on conflicts, or returns null
   * when the stored attempt FAILED and the same payload may be retried.
   * The stored DURABLE status decides: a Redis key alone never means "completed".
   */
  protected interpretExisting(existing: LedgerTransactionDoc, payloadHash: string): CreateOutcome | null {
    if (existing.payloadHash !== payloadHash) throw idempotencyKeyReused();
    if (existing.status === 'COMPLETED') return { transaction: toCreateResponse(existing), replayed: true };
    if (existing.status === 'FAILED') return null;
    throw transactionInProgress(); // PENDING / PROCESSING
  }

  /** Day 3: atomic ledger write. */
  protected processNew(
    _ctx: TenantContext,
    _models: LedgerModels,
    _payload: NormalizedPayload,
    _payloadHash: string,
    _retryOf: string | null,
  ): Promise<CreateOutcome> {
    return Promise.reject(notImplemented('Ledger write'));
  }

  listTransactions(_ctx: TenantContext, _query: ListTransactionsQuery): Promise<PaginatedTransactions> {
    return Promise.reject(notImplemented('List transactions'));
  }

  getTransaction(_ctx: TenantContext, _transactionId: string): Promise<TransactionDetailView> {
    return Promise.reject(notImplemented('Get transaction'));
  }

  getSummary(_ctx: TenantContext, _currency: LedgerSummary['currency']): Promise<LedgerSummary> {
    return Promise.reject(notImplemented('Ledger summary'));
  }
}
