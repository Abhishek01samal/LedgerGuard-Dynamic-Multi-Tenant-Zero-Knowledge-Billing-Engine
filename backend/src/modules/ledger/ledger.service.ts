import type { ClientSession } from 'mongoose';
import { AppError } from '../../middleware/error.middleware';
import { isDuplicateKeyError, runInTransaction } from '../transactions/transaction.service';
import { getIdempotencyGuard } from './ledger.guard';
import {
  idempotencyKeyMismatch,
  idempotencyKeyReused,
  LedgerProcessingError,
  LockUnavailableError,
  transactionInProgress,
} from './ledger.errors';
import {
  fromMinorUnits,
  generateTransactionId,
  hashPayload,
  normalizePayload,
  toCreateResponse,
  type NormalizedPayload,
} from './ledger.mapper';
import { getLedgerModels, type LedgerModels } from './ledger.model';
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
  IdempotencyGuard,
  LedgerSummary,
  LedgerTransactionDoc,
  ListTransactionsQuery,
  PaginatedTransactions,
  TenantContext,
  TransactionDetailView,
} from './ledger.types';

/** Test/demo seams. Never wired to user input in production. */
export interface ProcessingHooks {
  /** Runs inside the DB transaction after both entries are written, before commit. */
  afterEntriesWritten?: (payload: NormalizedPayload) => Promise<void> | void;
}

export interface LedgerServiceOptions {
  /** Defaults to the registered guard (in-memory until Person 2 registers Redis). */
  guard?: IdempotencyGuard;
  hooks?: ProcessingHooks;
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

  /* ------------------------------------------------------------------ */
  /* Create (idempotent)                                                 */
  /* Redis lock (Person 2) -> existing-event check -> ONE Mongo txn.     */
  /* ------------------------------------------------------------------ */
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
        const existing = await this.findByEvent(models, ctx.tenantId, input.eventId);
        if (existing) {
          const decided = this.interpretExisting(existing, payloadHash);
          if (decided) return decided;
          // FAILED earlier with the same payload: retrying with the same key is allowed.
          return await this.processNew(ctx, models, payload, payloadHash, existing.transactionId);
        }
        return await this.processNew(ctx, models, payload, payloadHash, null);
      });
    } catch (err) {
      if (err instanceof LockUnavailableError) throw transactionInProgress();
      throw err;
    }
  }

  private findByEvent(models: LedgerModels, tenantId: string, eventId: string): Promise<LedgerTransactionDoc | null> {
    return models.Transaction.findOne({ tenantId, eventId }).lean();
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

  /** Atomic write: transaction row + DEBIT entry + CREDIT entry commit together or not at all. */
  protected async processNew(
    ctx: TenantContext,
    models: LedgerModels,
    payload: NormalizedPayload,
    payloadHash: string,
    retryOf: string | null,
  ): Promise<CreateOutcome> {
    try {
      const doc = await runInTransaction(ctx.connection, (session) =>
        this.writeLedger(ctx, models, payload, payloadHash, retryOf, session),
      );
      return { transaction: toCreateResponse(doc), replayed: false };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        // Lost a race (lock expired / Redis down). The unique index is authoritative:
        // read the winner and answer as if this were a normal retry.
        const winner = await this.findByEvent(models, ctx.tenantId, payload.eventId);
        if (winner) {
          const decided = this.interpretExisting(winner, hashPayload(payload));
          if (decided) return decided;
        }
        throw transactionInProgress();
      }
      // Infra/config errors (e.g. no replica set) and validation conflicts pass through untouched.
      if (err instanceof AppError && !(err instanceof LedgerProcessingError)) throw err;
      throw await this.recordFailure(ctx, models, payload, payloadHash, retryOf, err);
    }
  }

  private async writeLedger(
    ctx: TenantContext,
    models: LedgerModels,
    payload: NormalizedPayload,
    payloadHash: string,
    retryOf: string | null,
    session: ClientSession,
  ): Promise<LedgerTransactionDoc> {
    const now = new Date();
    let tx: LedgerTransactionDoc;

    if (retryOf) {
      const updated = await models.Transaction.findOneAndUpdate(
        { tenantId: ctx.tenantId, transactionId: retryOf, status: 'FAILED' },
        { $set: { status: 'COMPLETED', failureReason: null, completedAt: now }, $inc: { attempts: 1 } },
        { new: true, session },
      ).lean();
      if (!updated) throw transactionInProgress(); // someone else already moved it
      tx = updated;
    } else {
      const [created] = await models.Transaction.create(
        [
          {
            tenantId: ctx.tenantId,
            transactionId: generateTransactionId(),
            eventId: payload.eventId,
            payloadHash,
            status: 'COMPLETED',
            amountMinor: payload.amountMinor,
            currency: payload.currency,
            description: payload.description,
            debitAccount: payload.debitAccount,
            creditAccount: payload.creditAccount,
            attempts: 1,
            createdBy: ctx.userId,
            completedAt: now,
          },
        ],
        { session },
      );
      if (!created) throw new Error('Transaction row was not created');
      tx = created.toObject();
    }

    const base = {
      tenantId: ctx.tenantId,
      transactionId: tx.transactionId,
      amountMinor: payload.amountMinor,
      currency: payload.currency,
    };
    await models.Entry.insertMany(
      [
        { ...base, accountId: payload.debitAccount, entryType: 'DEBIT' as const },
        { ...base, accountId: payload.creditAccount, entryType: 'CREDIT' as const },
      ],
      { session, ordered: true },
    );

    await this.options.hooks?.afterEntriesWritten?.(payload);
    return tx;
  }

  /**
   * The DB transaction is already rolled back when we get here.
   * Persist a FAILED record (outside the aborted transaction) so the failure is
   * auditable and the same key can be retried. Never leaks internal error text.
   */
  private async recordFailure(
    ctx: TenantContext,
    models: LedgerModels,
    payload: NormalizedPayload,
    payloadHash: string,
    retryOf: string | null,
    cause: unknown,
  ): Promise<AppError> {
    const isBusiness = cause instanceof LedgerProcessingError;
    const reason = isBusiness ? cause.message : 'Transaction could not be completed and was rolled back';
    console.error('[ledger] transaction rolled back', { tenantId: ctx.tenantId, eventId: payload.eventId, code: isBusiness ? cause.code : 'UNEXPECTED' });

    let failed: LedgerTransactionDoc | null = null;
    try {
      if (retryOf) {
        failed = await models.Transaction.findOneAndUpdate(
          { tenantId: ctx.tenantId, transactionId: retryOf, status: 'FAILED' },
          { $set: { failureReason: reason }, $inc: { attempts: 1 } },
          { new: true },
        ).lean();
      } else {
        failed = await models.Transaction.findOneAndUpdate(
          { tenantId: ctx.tenantId, eventId: payload.eventId },
          {
            $setOnInsert: {
              transactionId: generateTransactionId(),
              payloadHash,
              status: 'FAILED',
              amountMinor: payload.amountMinor,
              currency: payload.currency,
              description: payload.description,
              debitAccount: payload.debitAccount,
              creditAccount: payload.creditAccount,
              failureReason: reason,
              attempts: 1,
              createdBy: ctx.userId,
            },
          },
          { upsert: true, new: true },
        ).lean();
      }
    } catch (recordErr) {
      console.error('[ledger] could not persist FAILED record', recordErr);
    }

    const data = {
      transactionId: failed?.transactionId ?? null,
      eventId: payload.eventId,
      status: 'FAILED' as const,
      amount: fromMinorUnits(payload.amountMinor),
      currency: payload.currency,
      failureReason: reason,
      rolledBack: true,
    };
    return isBusiness
      ? new AppError(cause.statusCode, reason, cause.code, data)
      : new AppError(500, reason, 'TRANSACTION_FAILED', data);
  }

  /* Day 4 */
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
