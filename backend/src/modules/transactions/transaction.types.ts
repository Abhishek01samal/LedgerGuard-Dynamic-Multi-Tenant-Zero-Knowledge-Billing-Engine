import type { ClientSession } from 'mongoose';

/**
 * Durable statuses. Only COMPLETED and FAILED are ever persisted by Week 2 code:
 * the ledger write happens inside ONE MongoDB transaction, so an in-flight
 * (PENDING/PROCESSING) row is never visible to other readers. The two extra
 * values stay in the type because the API contract (and the UI) know them.
 */
export const TRANSACTION_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

/** Unit of work executed inside a MongoDB multi-document transaction. */
export type TransactionWork<T> = (session: ClientSession) => Promise<T>;
