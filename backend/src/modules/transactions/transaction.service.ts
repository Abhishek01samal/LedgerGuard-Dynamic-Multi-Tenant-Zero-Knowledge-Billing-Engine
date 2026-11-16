import type { Connection } from 'mongoose';
import { AppError } from '../../middleware/error.middleware';
import type { TransactionWork } from './transaction.types';

/**
 * Runs `work` inside a MongoDB multi-document transaction.
 *  - Commits if `work` resolves, aborts (rolls back EVERYTHING) if it throws.
 *  - Mongoose re-runs `work` on TransientTransactionError (e.g. write conflicts),
 *    so `work` must be safe to run again: do all reads/writes with the given session.
 *  - Requires a replica set (or sharded cluster); standalone mongod is rejected.
 */
export async function runInTransaction<T>(connection: Connection, work: TransactionWork<T>): Promise<T> {
  try {
    return await connection.transaction(work, {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      maxCommitTimeMS: 10_000,
    });
  } catch (err) {
    if (isTransactionsUnsupported(err)) {
      throw new AppError(
        503,
        'MongoDB transactions require a replica set. Start MongoDB with --replSet and add ?replicaSet=rs0 to the URI.',
        'TRANSACTIONS_UNSUPPORTED',
      );
    }
    throw err;
  }
}

function errorInfo(err: unknown): { code?: unknown; message: string } {
  if (typeof err === 'object' && err !== null) {
    const e = err as { code?: unknown; message?: unknown };
    return { code: e.code, message: typeof e.message === 'string' ? e.message : '' };
  }
  return { message: String(err) };
}

/** MongoDB duplicate key (unique index) violation, incl. bulk writes. */
export function isDuplicateKeyError(err: unknown): boolean {
  return errorInfo(err).code === 11000;
}

function isTransactionsUnsupported(err: unknown): boolean {
  const { code, message } = errorInfo(err);
  return code === 20 || /replica set member or mongos|Transaction numbers are only allowed/i.test(message);
}
