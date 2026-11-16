import { createHash, randomUUID } from 'node:crypto';
import type {
  CreateTransactionInput,
  CreateTransactionResponse,
  Currency,
  LedgerEntryDoc,
  LedgerEntryView,
  LedgerTransactionDoc,
  TransactionDetailView,
  TransactionView,
} from './ledger.types';

/**
 * Every supported currency (INR, USD, EUR, GBP) has 2 decimals, so
 * minor units = amount * 100. Money is stored as an integer, never a float.
 */
export const MINOR_UNITS_PER_MAJOR = 100;

export function toMinorUnits(amount: number): number {
  return Math.round(amount * MINOR_UNITS_PER_MAJOR);
}

export function fromMinorUnits(amountMinor: number): number {
  return amountMinor / MINOR_UNITS_PER_MAJOR;
}

/** The fields that define "the same request". Amount is normalised to minor units. */
export interface NormalizedPayload {
  eventId: string;
  description: string;
  amountMinor: number;
  currency: Currency;
  debitAccount: string;
  creditAccount: string;
}

export function normalizePayload(input: CreateTransactionInput): NormalizedPayload {
  return {
    eventId: input.eventId,
    description: input.description,
    amountMinor: toMinorUnits(input.amount),
    currency: input.currency,
    debitAccount: input.debitAccount,
    creditAccount: input.creditAccount,
  };
}

/**
 * Stable fingerprint of a request. Same key + same hash => safe replay.
 * Same key + different hash => 409. Field order is fixed on purpose.
 */
export function hashPayload(p: NormalizedPayload): string {
  return createHash('sha256')
    .update(JSON.stringify([p.eventId, p.description, p.amountMinor, p.currency, p.debitAccount, p.creditAccount]))
    .digest('hex');
}

export function generateTransactionId(): string {
  return `txn_${randomUUID()}`;
}

export function toCreateResponse(doc: LedgerTransactionDoc): CreateTransactionResponse {
  return {
    transactionId: doc.transactionId,
    eventId: doc.eventId,
    status: doc.status,
    amount: fromMinorUnits(doc.amountMinor),
    currency: doc.currency,
  };
}

export function toTransactionView(doc: LedgerTransactionDoc): TransactionView {
  return {
    ...toCreateResponse(doc),
    description: doc.description,
    debitAccount: doc.debitAccount,
    creditAccount: doc.creditAccount,
    failureReason: doc.failureReason ?? null,
    attempts: doc.attempts,
    createdAt: doc.createdAt.toISOString(),
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  };
}

export function toEntryView(entry: LedgerEntryDoc): LedgerEntryView {
  return {
    accountId: entry.accountId,
    entryType: entry.entryType,
    amount: fromMinorUnits(entry.amountMinor),
    currency: entry.currency,
  };
}

export function toDetailView(doc: LedgerTransactionDoc, entries: LedgerEntryDoc[]): TransactionDetailView {
  return { ...toTransactionView(doc), entries: entries.map(toEntryView) };
}

/** Escape user text before using it inside a Mongo $regex. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
