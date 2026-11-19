import type { ClientSession } from 'mongoose';
import { env } from '../../config/env';
import type { FilterQuery } from 'mongoose';
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
  escapeRegex,
  fromMinorUnits,
  generateTransactionId,
  hashPayload,
  normalizePayload,
  toCreateResponse,
  toDetailView,
  toTransactionView,
  type NormalizedPayload,
} from './ledger.mapper';
import { getLedgerModels, type LedgerModels } from './ledger.model';
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
  Currency,
  EntryType,
  IdempotencyGuard,
  LedgerSummary,
  LedgerTransactionDoc,
  ListTransactionsQuery,
  PaginatedTransactions,
  TenantContext,
  TransactionDetailView,
  TransactionStatus,
} from './ledger.types';

/** Test/demo seams. Never wired to user input in production. */
export interface ProcessingHooks {
  /** Runs inside the DB transaction after both entries are written, before commit. */
  afterEntriesWritten?: (payload: NormalizedPayload, session: ClientSession) => Promise<void> | void;
}

export interface LedgerServiceOptions {
  /** Defaults to the registered guard (in-memory until Person 2 registers Redis). */
  guard?: IdempotencyGuard;
  hooks?: ProcessingHooks;
  /**
   * Demo only (mid-project review): a transaction whose creditAccount equals this value
   * is written and then deliberately failed so the rollback can be shown live.
   * Defaults to env.ledgerDemoFailAccount, which is always undefined in production.
   */
  demoFailAccount?: string | undefined;
}

export interface CreateOutcome {
  transaction: CreateTransactionResponse;
  replayed: boolean;
}

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

    await this.options.hooks?.afterEntriesWritten?.(payload, session);
    await this.assertBalanced(ctx, models, tx.transactionId, payload, session);

    const demoFail = this.options.demoFailAccount ?? env.ledgerDemoFailAccount;
    if (demoFail && payload.creditAccount === demoFail) {
      throw new LedgerProcessingError('Simulated failure: the ledger write was rolled back', 'TRANSACTION_FAILED');
    }
    return tx;
  }

  /**
   * Double-entry invariant, checked INSIDE the transaction (so it sees our own
   * uncommitted writes): exactly one DEBIT and one CREDIT, each equal to the
   * transaction amount. Any violation throws, which aborts the transaction.
   */
  private async assertBalanced(
    ctx: TenantContext,
    models: LedgerModels,
    transactionId: string,
    payload: NormalizedPayload,
    session: ClientSession,
  ): Promise<void> {
    const rows = await models.Entry.aggregate<{ _id: EntryType; count: number; amountMinor: number }>([
      { $match: { tenantId: ctx.tenantId, transactionId } },
      { $group: { _id: '$entryType', count: { $sum: 1 }, amountMinor: { $sum: '$amountMinor' } } },
    ]).session(session);
    const debit = rows.find((r) => r._id === 'DEBIT');
    const credit = rows.find((r) => r._id === 'CREDIT');
    const ok =
      rows.length === 2 &&
      debit?.count === 1 &&
      credit?.count === 1 &&
      debit.amountMinor === payload.amountMinor &&
      credit.amountMinor === payload.amountMinor;
    if (!ok) {
      throw new LedgerProcessingError('Ledger entries are not balanced; transaction rolled back', 'LEDGER_IMBALANCE');
    }
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

  /* ------------------------------------------------------------------ */
  /* Reads. Every query is scoped by tenantId (on top of the tenant DB). */
  /* ------------------------------------------------------------------ */
  async listTransactions(ctx: TenantContext, query: ListTransactionsQuery): Promise<PaginatedTransactions> {
    const { Transaction } = await this.models(ctx);

    const filter: FilterQuery<LedgerTransactionDoc> = { tenantId: ctx.tenantId };
    if (query.status) filter.status = query.status;
    if (query.from || query.to) {
      filter.createdAt = {
        ...(query.from ? { $gte: query.from } : {}),
        ...(query.to ? { $lte: query.to } : {}),
      };
    }
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), 'i');
      filter.$or = [{ eventId: pattern }, { transactionId: pattern }, { description: pattern }];
    }

    const [docs, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((query.page - 1) * query.limit)
        .limit(query.limit)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return {
      transactions: docs.map(toTransactionView),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getTransaction(ctx: TenantContext, transactionId: string): Promise<TransactionDetailView> {
    const { Transaction, Entry } = await this.models(ctx);
    const doc = await Transaction.findOne({ tenantId: ctx.tenantId, transactionId }).lean();
    // Another tenant's id looks exactly like a missing one: never reveal existence.
    if (!doc) throw new AppError(404, 'Transaction not found', 'TRANSACTION_NOT_FOUND');
    const entries = await Entry.find({ tenantId: ctx.tenantId, transactionId }).sort({ _id: 1 }).lean();
    return toDetailView(doc, entries);
  }

  async getSummary(ctx: TenantContext, currency: Currency): Promise<LedgerSummary> {
    const { Transaction } = await this.models(ctx);
    const rows = await Transaction.aggregate<{ _id: TransactionStatus; count: number; amountMinor: number }>([
      { $match: { tenantId: ctx.tenantId, currency } },
      { $group: { _id: '$status', count: { $sum: 1 }, amountMinor: { $sum: '$amountMinor' } } },
    ]);
    const by = new Map(rows.map((r) => [r._id, r]));
    return {
      totalTransactions: rows.reduce((n, r) => n + r.count, 0),
      successfulTransactions: by.get('COMPLETED')?.count ?? 0,
      failedTransactions: by.get('FAILED')?.count ?? 0,
      // Only money that actually moved counts: COMPLETED transactions.
      totalAmount: fromMinorUnits(by.get('COMPLETED')?.amountMinor ?? 0),
      currency,
    };
  }
}
