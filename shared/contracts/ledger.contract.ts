import { isRecord } from './common.contract';

/**
 * Week 2 ledger contracts (frozen by Person 4 on Day 1).
 * Money is a positive integer (stored as integer minor units or Decimal128). Floats are rejected.
 */

export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export const TRANSACTION_STATUSES: readonly TransactionStatus[] = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
];

export interface CreateTransactionRequest {
  eventId: string;
  description: string;
  amount: number;
  currency: string;
  debitAccount: string;
  creditAccount: string;
}

export interface TransactionDto {
  transactionId: string;
  eventId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  description: string;
  debitAccount?: string;
  creditAccount?: string;
  createdAt?: string;
}

/** POST response data: the agreed minimal shape. */
export interface CreateTransactionData {
  transactionId: string;
  eventId: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
}

export interface CreateTransactionResponse {
  success: true;
  message: string;
  data: CreateTransactionData;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TransactionListResponse {
  success: true;
  data: { transactions: TransactionDto[]; pagination: Pagination };
}

export interface TransactionDetailResponse {
  success: true;
  data: TransactionDto;
}

export interface LedgerSummary {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalAmount: number;
  currency: string;
}

export interface LedgerSummaryResponse {
  success: true;
  data: LedgerSummary;
}

export const LEDGER_ROUTES = {
  transactions: '/api/v1/ledger/transactions',
  transactionById: (id: string): string => `/api/v1/ledger/transactions/${encodeURIComponent(id)}`,
  summary: '/api/v1/ledger/summary',
} as const;

export const IDEMPOTENCY_HEADER = 'Idempotency-Key' as const;
export const REPLAY_HEADER = 'Idempotent-Replayed' as const;

/** HTTP statuses the team agreed on. Tests and the frontend import these, nobody hard-codes them. */
export const LEDGER_STATUS = {
  created: 201, // first processing of an event
  replayed: 200, // same key + same payload: original result, header Idempotent-Replayed: true
  validation: 400, // bad body, missing Idempotency-Key, header/body eventId mismatch
  notFound: 404, // unknown id, or an id that belongs to another tenant (never 403)
  conflict: 409, // same key + different payload, or the event is still being processed
  failed: 500, // transaction rolled back
  unavailable: 503, // dependency (Redis) unavailable and the request was refused (fail closed)
} as const;

/** Error codes the frontend can branch on (extends AUTH_ERROR_CODES / common codes). */
export const LEDGER_ERROR_CODES = {
  validation: 'VALIDATION_ERROR',
  idempotencyKeyRequired: 'IDEMPOTENCY_KEY_REQUIRED',
  idempotencyKeyMismatch: 'IDEMPOTENCY_KEY_MISMATCH',
  idempotencyConflict: 'IDEMPOTENCY_CONFLICT',
  requestInProgress: 'REQUEST_IN_PROGRESS',
  transactionNotFound: 'TRANSACTION_NOT_FOUND',
  transactionFailed: 'TRANSACTION_FAILED',
  serviceUnavailable: 'SERVICE_UNAVAILABLE',
} as const;

export function isTransactionStatus(value: unknown): value is TransactionStatus {
  return typeof value === 'string' && (TRANSACTION_STATUSES as readonly string[]).includes(value);
}

export function isCreateTransactionData(value: unknown): value is CreateTransactionData {
  return (
    isRecord(value) &&
    typeof value.transactionId === 'string' &&
    typeof value.eventId === 'string' &&
    isTransactionStatus(value.status) &&
    typeof value.amount === 'number' &&
    typeof value.currency === 'string'
  );
}

export function isCreateTransactionResponse(value: unknown): value is CreateTransactionResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    typeof value.message === 'string' &&
    isCreateTransactionData(value.data)
  );
}

export function isTransactionDto(value: unknown): value is TransactionDto {
  return (
    isCreateTransactionData(value) &&
    'description' in value &&
    typeof value.description === 'string'
  );
}

export function isPagination(value: unknown): value is Pagination {
  return (
    isRecord(value) &&
    typeof value.page === 'number' &&
    typeof value.limit === 'number' &&
    typeof value.total === 'number' &&
    typeof value.totalPages === 'number'
  );
}

export function isTransactionListResponse(value: unknown): value is TransactionListResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isRecord(value.data) &&
    Array.isArray(value.data.transactions) &&
    value.data.transactions.every(isTransactionDto) &&
    isPagination(value.data.pagination)
  );
}

export function isTransactionDetailResponse(value: unknown): value is TransactionDetailResponse {
  return isRecord(value) && value.success === true && isTransactionDto(value.data);
}

export function isLedgerSummaryResponse(value: unknown): value is LedgerSummaryResponse {
  return (
    isRecord(value) &&
    value.success === true &&
    isRecord(value.data) &&
    typeof value.data.totalTransactions === 'number' &&
    typeof value.data.successfulTransactions === 'number' &&
    typeof value.data.failedTransactions === 'number' &&
    typeof value.data.totalAmount === 'number' &&
    typeof value.data.currency === 'string'
  );
}
