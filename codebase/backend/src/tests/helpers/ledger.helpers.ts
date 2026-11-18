import { randomUUID } from 'node:crypto';
import type { Application } from 'express';
import request from 'supertest';
import type { Response } from 'supertest';
import { isApiErrorResponse } from '../../../../shared/contracts/common.contract';
import {
  IDEMPOTENCY_HEADER,
  LEDGER_ROUTES,
  isCreateTransactionResponse,
  isLedgerSummaryResponse,
  isTransactionListResponse,
} from '../../../../shared/contracts/ledger.contract';
import type {
  CreateTransactionRequest,
  CreateTransactionData,
  LedgerSummary,
} from '../../../../shared/contracts/ledger.contract';
import { signRs256 } from './auth.helpers';

export type TenantKey = 'A' | 'B';

const IDENTITIES = {
  A: { sub: 'user_001', email: 'admin@companya.com', tenantId: 'company_A' },
  B: { sub: 'user_002', email: 'admin@companyb.com', tenantId: 'company_B' },
} as const;

/** A correctly signed RS256 token for a seeded tenant admin. */
export function tokenFor(tenant: TenantKey): string {
  return signRs256({ ...IDENTITIES[tenant] });
}

/** Unique per call, so tests never collide with data from earlier runs. */
export function uniqueEventId(prefix = 'evt_test'): string {
  return `${prefix}_${randomUUID()}`;
}

export function buildPayload(
  overrides: Partial<CreateTransactionRequest> = {},
): CreateTransactionRequest {
  return {
    eventId: uniqueEventId(),
    description: 'Monthly subscription payment',
    amount: 1000,
    currency: 'INR',
    debitAccount: 'customer_001',
    creditAccount: 'merchant_001',
    ...overrides,
  };
}

interface PostOptions {
  /** Header value. Defaults to the body eventId. `null` omits the header entirely. */
  idempotencyKey?: string | null;
}

/** POST /api/v1/ledger/transactions. The body is typed loosely so tests can send bad input. */
export function postTransaction(
  app: Application,
  token: string,
  payload: Record<string, unknown>,
  options: PostOptions = {},
): Promise<Response> {
  const key = options.idempotencyKey === undefined ? payload.eventId : options.idempotencyKey;
  const req = request(app).post(LEDGER_ROUTES.transactions).set('Authorization', `Bearer ${token}`);
  if (typeof key === 'string') req.set(IDEMPOTENCY_HEADER, key);
  return req.send(payload);
}

export function listTransactions(
  app: Application,
  token: string,
  query: Record<string, string | number> = {},
): Promise<Response> {
  return request(app)
    .get(LEDGER_ROUTES.transactions)
    .query(query)
    .set('Authorization', `Bearer ${token}`);
}

export function getTransaction(app: Application, token: string, id: string): Promise<Response> {
  return request(app)
    .get(LEDGER_ROUTES.transactionById(id))
    .set('Authorization', `Bearer ${token}`);
}

export function getSummary(app: Application, token: string): Promise<Response> {
  return request(app).get(LEDGER_ROUTES.summary).set('Authorization', `Bearer ${token}`);
}

/** Total number of transactions the tenant can see right now (pagination.total). */
export async function totalTransactions(app: Application, token: string): Promise<number> {
  const res = await listTransactions(app, token, { page: 1, limit: 1 });
  if (res.status !== 200 || !isTransactionListResponse(res.body)) {
    throw new Error(`Cannot read the ledger total (status ${res.status})`);
  }
  return res.body.data.pagination.total;
}

export async function readSummary(app: Application, token: string): Promise<LedgerSummary> {
  const res = await getSummary(app, token);
  if (res.status !== 200 || !isLedgerSummaryResponse(res.body)) {
    throw new Error(`Cannot read the ledger summary (status ${res.status})`);
  }
  return res.body.data;
}

/** Data of a successful create/replay response, or a clear failure. */
export function createdData(res: Response): CreateTransactionData {
  if (!isCreateTransactionResponse(res.body)) {
    throw new Error(`Not a create-transaction response (status ${res.status}): ${res.text}`);
  }
  return res.body.data;
}

/** Assert the standard error shape and an exact status + code. */
export function expectError(res: Response, status: number, code: string): void {
  expect(res.status).toBe(status);
  expect(isApiErrorResponse(res.body)).toBe(true);
  expect(res.body.code).toBe(code);
}
