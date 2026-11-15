import type { Connection } from 'mongoose';
import { TRANSACTION_STATUSES, type TransactionStatus } from '../transactions/transaction.types';

export { TRANSACTION_STATUSES };
export type { TransactionStatus };

export const SUPPORTED_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const ENTRY_TYPES = ['DEBIT', 'CREDIT'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Persisted shapes.                                                   */
/* Person 2 owns ledger.model.ts: their Mongoose schemas MUST match    */
/* these interfaces (this is the "agreed interface" from the plan).    */
/* Money is stored as integer MINOR units (paise/cents), never floats. */
/* ------------------------------------------------------------------ */
export interface LedgerTransactionDoc {
  tenantId: string;
  transactionId: string; // "txn_<uuid>", public identifier
  eventId: string; // idempotency key; unique per tenant
  payloadHash: string; // sha256 of the canonical request, detects key reuse
  status: TransactionStatus;
  amountMinor: number;
  currency: Currency;
  description: string;
  debitAccount: string;
  creditAccount: string;
  failureReason?: string | null;
  attempts: number;
  createdBy: string;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntryDoc {
  tenantId: string;
  transactionId: string;
  accountId: string;
  entryType: EntryType;
  amountMinor: number;
  currency: Currency;
  createdAt: Date;
}

/* ------------------------------------------------------------------ */
/* Service-level types                                                 */
/* ------------------------------------------------------------------ */
export interface CreateTransactionInput {
  eventId: string;
  description: string;
  amount: number; // major units, max 2 decimals (validated)
  currency: Currency;
  debitAccount: string;
  creditAccount: string;
}

export interface TenantContext {
  connection: Connection;
  tenantId: string;
  userId: string;
}

export interface ListTransactionsQuery {
  page: number;
  limit: number;
  status?: TransactionStatus | undefined;
  search?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
}

/* ------------------------------------------------------------------ */
/* API response shapes (frozen contract, docs/api-contracts.md)        */
/* ------------------------------------------------------------------ */
export interface CreateTransactionResponse {
  transactionId: string;
  eventId: string;
  status: TransactionStatus;
  amount: number;
  currency: Currency;
}

export interface TransactionView extends CreateTransactionResponse {
  description: string;
  debitAccount: string;
  creditAccount: string;
  failureReason: string | null;
  attempts: number;
  createdAt: string;
  completedAt: string | null;
}

export interface LedgerEntryView {
  accountId: string;
  entryType: EntryType;
  amount: number;
  currency: Currency;
}

export interface TransactionDetailView extends TransactionView {
  entries: LedgerEntryView[];
}

export interface PaginatedTransactions {
  transactions: TransactionView[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface LedgerSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  currency: Currency;
}

/* ------------------------------------------------------------------ */
/* Port implemented by Person 2 (Redis lock + idempotency).            */
/* Person 1 only depends on this interface, never on Redis directly.   */
/* ------------------------------------------------------------------ */
export interface IdempotencyGuard {
  /**
   * Run `work` while holding the distributed lock for `lockKey`
   * (already tenant-scoped, e.g. "company_A:evt_001").
   * Must throw LockUnavailableError if the lock cannot be obtained in time.
   * Must release the lock only if this caller still owns it.
   * Correctness never depends on this: the MongoDB unique index is authoritative.
   */
  runExclusive<T>(lockKey: string, work: () => Promise<T>): Promise<T>;
}
