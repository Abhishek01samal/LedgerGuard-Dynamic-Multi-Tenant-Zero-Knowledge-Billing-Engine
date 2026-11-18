import { randomUUID } from 'node:crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { connectMasterDatabase } from '../../database/mongo.connection';
import { AppError } from '../../middleware/error.middleware';
import { acquireLock, releaseLock } from '../../services/lock.service';
import { LEDGER_ERROR_CODES, LEDGER_STATUS } from '../../../../shared/contracts/ledger.contract';
import type {
  CreateTransactionData,
  LedgerSummary,
  Pagination,
  TransactionDto,
} from '../../../../shared/contracts/ledger.contract';
import { LedgerEntryModel, LedgerTransactionModel, type LedgerEntry } from './ledger.model';
import type { LedgerTransaction } from './ledger.model';
import type { CreateTransactionInput } from './ledger.validation';

/**
 * Layered duplicate protection (docs/redis-locking.md):
 *  1. Redis lock - coordination only, may be lost (TTL) or unavailable (fail closed).
 *  2. Unique index { tenantId, eventId } - authoritative, makes duplicates impossible.
 *  3. MongoDB transaction - debit + credit + record commit atomically or not at all.
 * Redis hints (idem:ledger:...) are never trusted; the durable record is the truth.
 */

/** Lock TTL must exceed the slowest transaction; never "extend until it works". */
const LOCK_TTL_MS = 10_000;

let connectionPromise: Promise<void> | null = null;

mongoose.connection.once('disconnected', () => {
  // Test files call mongoose.disconnect() in afterAll; the next request must reconnect.
  connectionPromise = null;
});

function ensureConnected(): Promise<void> {
  if (!connectionPromise) {
    connectionPromise = openConnection().catch((err: unknown) => {
      connectionPromise = null;
      throw err;
    });
  }
  return connectionPromise;
}

async function openConnection(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    await connectMasterDatabase();
  }
  // Unique indexes are the authoritative duplicate guard - wait until they exist.
  await Promise.all([LedgerTransactionModel.init(), LedgerEntryModel.init()]);
}

export interface CreateResult {
  replayed: boolean;
  data: CreateTransactionData;
}

export interface ListResult {
  transactions: TransactionDto[];
  pagination: Pagination;
}

export async function createTransaction(
  tenantId: string,
  body: CreateTransactionInput,
): Promise<CreateResult> {
  await ensureConnected();

  const lockKey = `lock:ledger:${tenantId}:${body.eventId}`;
  let lock;
  try {
    lock = await acquireLock(lockKey, LOCK_TTL_MS);
  } catch {
    // Redis unavailable: fail closed (LEDGER_STATUS.unavailable) rather than
    // risk double-processing without the coordination layer.
    throw new AppError(
      LEDGER_STATUS.unavailable,
      'Locking service unavailable, please retry',
      LEDGER_ERROR_CODES.serviceUnavailable,
    );
  }

  if (!lock) {
    // Somebody else holds the lock: only a durable record may answer for us.
    const held = await findExisting(tenantId, body.eventId);
    if (held) return answer(held, body);
    throw new AppError(
      LEDGER_STATUS.conflict,
      'The event is still being processed, please retry',
      LEDGER_ERROR_CODES.requestInProgress,
    );
  }

  try {
    const existing = await findExisting(tenantId, body.eventId);
    if (existing) return answer(existing, body);
    return await commit(tenantId, body);
  } finally {
    await releaseLock(lock);
  }
}

export async function listTransactions(
  tenantId: string,
  page: number,
  limit: number,
): Promise<ListResult> {
  await ensureConnected();
  const filter = { tenantId };
  const [total, docs] = await Promise.all([
    LedgerTransactionModel.countDocuments(filter),
    LedgerTransactionModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return {
    transactions: docs.map(toDto),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** 404 for unknown ids AND for ids owned by another tenant - never 403. */
export async function getTransaction(
  tenantId: string,
  transactionId: string,
): Promise<TransactionDto> {
  await ensureConnected();
  const doc = await LedgerTransactionModel.findOne({ tenantId, transactionId });
  if (!doc) {
    throw new AppError(
      LEDGER_STATUS.notFound,
      'Transaction not found',
      LEDGER_ERROR_CODES.transactionNotFound,
    );
  }
  return toDto(doc);
}

export async function getSummary(tenantId: string): Promise<LedgerSummary> {
  await ensureConnected();
  const completed = { tenantId, status: 'COMPLETED' } as const;
  const [totalTransactions, successfulTransactions, failedTransactions, amounts] =
    await Promise.all([
      LedgerTransactionModel.countDocuments({ tenantId }),
      LedgerTransactionModel.countDocuments(completed),
      LedgerTransactionModel.countDocuments({ tenantId, status: 'FAILED' }),
      LedgerTransactionModel.aggregate<{ total: number; currency: string }>([
        { $match: completed },
        { $group: { _id: null, total: { $sum: '$amount' }, currency: { $first: '$currency' } } },
      ]),
    ]);
  const first = amounts[0];
  return {
    totalTransactions,
    successfulTransactions,
    failedTransactions,
    totalAmount: first?.total ?? 0,
    currency: first?.currency ?? 'INR',
  };
}

async function commit(tenantId: string, body: CreateTransactionInput): Promise<CreateResult> {
  const transactionId = `txn_${randomUUID()}`;
  const session = await mongoose.connection.startSession();
  try {
    const stored = await session.withTransaction(async () => {
      await saveEntry(session, {
        tenantId,
        eventId: body.eventId,
        side: 'DEBIT',
        account: body.debitAccount,
        amount: body.amount,
        currency: body.currency,
      });
      await saveEntry(session, {
        tenantId,
        eventId: body.eventId,
        side: 'CREDIT',
        account: body.creditAccount,
        amount: body.amount,
        currency: body.currency,
      });
      const record = new LedgerTransactionModel({
        tenantId,
        eventId: body.eventId,
        transactionId,
        status: 'COMPLETED',
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        debitAccount: body.debitAccount,
        creditAccount: body.creditAccount,
      });
      await record.save({ session });
      return record;
    });
    return { replayed: false, data: toCreateData(stored) };
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      // Lost a race with another writer: the unique index is authoritative, so
      // answer from the winner's durable record instead of reporting a failure.
      const winner = await findExisting(tenantId, body.eventId);
      if (winner) return answer(winner, body);
    }
    // Anything else rolled back: no money moved, no COMPLETED record exists.
    throw new AppError(
      LEDGER_STATUS.failed,
      'Ledger transaction failed and was rolled back',
      LEDGER_ERROR_CODES.transactionFailed,
    );
  } finally {
    await session.endSession();
  }
}

async function saveEntry(session: ClientSession, entry: LedgerEntry): Promise<void> {
  await new LedgerEntryModel(entry).save({ session });
}

async function findExisting(tenantId: string, eventId: string): Promise<LedgerTransaction | null> {
  return LedgerTransactionModel.findOne({ tenantId, eventId });
}

/** Replay the stored result for an identical payload, 409 for a changed one. */
function answer(existing: LedgerTransaction, body: CreateTransactionInput): CreateResult {
  if (!payloadMatches(existing, body)) {
    throw new AppError(
      LEDGER_STATUS.conflict,
      'Idempotency-Key was reused with a different payload',
      LEDGER_ERROR_CODES.idempotencyConflict,
    );
  }
  return { replayed: true, data: toCreateData(existing) };
}

function payloadMatches(existing: LedgerTransaction, body: CreateTransactionInput): boolean {
  return (
    existing.amount === body.amount &&
    existing.currency === body.currency &&
    existing.description === body.description &&
    (existing.debitAccount ?? '') === body.debitAccount &&
    (existing.creditAccount ?? '') === body.creditAccount
  );
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' && err !== null && 'code' in err && err.code === 11000 // MongoServerError: E11000 duplicate key
  );
}

function toCreateData(doc: LedgerTransaction): CreateTransactionData {
  return {
    transactionId: doc.transactionId,
    eventId: doc.eventId,
    status: doc.status,
    amount: doc.amount,
    currency: doc.currency,
  };
}

function toDto(doc: LedgerTransaction): TransactionDto {
  return {
    transactionId: doc.transactionId,
    eventId: doc.eventId,
    status: doc.status,
    amount: doc.amount,
    currency: doc.currency,
    description: doc.description,
    debitAccount: doc.debitAccount,
    creditAccount: doc.creditAccount,
    createdAt: isoDate(doc.createdAt),
  };
}

function isoDate(value: unknown): string | undefined {
  return value instanceof Date ? value.toISOString() : undefined;
}
