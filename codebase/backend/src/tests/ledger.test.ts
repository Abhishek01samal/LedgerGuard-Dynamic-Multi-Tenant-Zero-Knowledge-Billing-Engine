import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { isApiErrorResponse } from '../../../shared/contracts/common.contract';
import {
  LEDGER_ERROR_CODES,
  LEDGER_ROUTES,
  LEDGER_STATUS,
  isCreateTransactionResponse,
  isLedgerSummaryResponse,
  isTransactionDetailResponse,
  isTransactionListResponse,
} from '../../../shared/contracts/ledger.contract';
import {
  buildPayload,
  createdData,
  expectError,
  getSummary,
  getTransaction,
  listTransactions,
  postTransaction,
  readSummary,
  tokenFor,
  totalTransactions,
} from './helpers/ledger.helpers';
import { signRs256 } from './helpers';

const app = createApp();
const tokenA = tokenFor('A');
const tokenB = tokenFor('B');

afterAll(async () => {
  await mongoose.disconnect();
});

describe('authentication on every ledger route', () => {
  const routes: Array<[string, () => request.Test]> = [
    ['POST /transactions', () => request(app).post(LEDGER_ROUTES.transactions).send({})],
    ['GET /transactions', () => request(app).get(LEDGER_ROUTES.transactions)],
    ['GET /transactions/:id', () => request(app).get(LEDGER_ROUTES.transactionById('txn_1'))],
    ['GET /summary', () => request(app).get(LEDGER_ROUTES.summary)],
  ];

  it.each(routes)('%s rejects a request with no token (401)', async (_name, send) => {
    const res = await send();
    expect(res.status).toBe(401);
    expect(isApiErrorResponse(res.body)).toBe(true);
    expect(res.body.code).toBe('UNAUTHENTICATED');
  });

  it.each(routes)('%s rejects an expired token (401 TOKEN_EXPIRED)', async (_name, send) => {
    const res = await send().set('Authorization', `Bearer ${signRs256({}, { expired: true })}`);
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TOKEN_EXPIRED');
  });
});

describe('POST /api/v1/ledger/transactions', () => {
  it('returns the agreed success contract', async () => {
    const payload = buildPayload({ description: 'Monthly subscription payment' });
    const res = await postTransaction(app, tokenA, { ...payload });

    expect(res.status).toBe(LEDGER_STATUS.created);
    expect(isCreateTransactionResponse(res.body)).toBe(true);
    expect(res.body.message).toBe('Transaction completed');
    expect(createdData(res)).toMatchObject({
      eventId: payload.eventId,
      status: 'COMPLETED',
      amount: 1000,
      currency: 'INR',
    });
  });

  it('never echoes secrets or internal fields', async () => {
    const res = await postTransaction(app, tokenA, { ...buildPayload() });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/eyJ/); // no JWT
    expect(raw).not.toMatch(/password|secret|privateKey/i);
    expect(raw).not.toMatch(/"_id"|"__v"/);
  });

  it('ignores a spoofed tenant in the header, query string and body', async () => {
    const payload = buildPayload();
    const beforeB = await totalTransactions(app, tokenB);

    const res = await request(app)
      .post(`${LEDGER_ROUTES.transactions}?tenantId=company_B`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', payload.eventId)
      .set('X-Tenant-Id', 'company_B')
      .send({ ...payload, tenantId: 'company_B' });

    expect(res.status).toBe(LEDGER_STATUS.created);
    expect(await totalTransactions(app, tokenB)).toBe(beforeB); // Company B saw nothing
    const stored = await getTransaction(app, tokenA, createdData(res).transactionId);
    expect(stored.status).toBe(200); // it lives in Company A
  });
});

describe('GET /api/v1/ledger/transactions', () => {
  it('returns the list contract with pagination', async () => {
    await postTransaction(app, tokenA, { ...buildPayload() });
    const res = await listTransactions(app, tokenA, { page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(isTransactionListResponse(res.body)).toBe(true);
    const { transactions, pagination } = res.body.data;
    expect(transactions.length).toBeGreaterThan(0);
    expect(transactions.length).toBeLessThanOrEqual(10);
    expect(pagination.page).toBe(1);
    expect(pagination.limit).toBe(10);
    expect(pagination.total).toBeGreaterThanOrEqual(transactions.length);
    expect(pagination.totalPages).toBe(Math.ceil(pagination.total / 10));
  });

  it('honours the page size', async () => {
    for (let i = 0; i < 3; i++) await postTransaction(app, tokenA, { ...buildPayload() });
    const res = await listTransactions(app, tokenA, { page: 1, limit: 2 });
    expect(res.body.data.transactions).toHaveLength(2);
    expect(res.body.data.pagination.limit).toBe(2);
  });

  it('pages do not overlap', async () => {
    for (let i = 0; i < 4; i++) await postTransaction(app, tokenA, { ...buildPayload() });
    const first = await listTransactions(app, tokenA, { page: 1, limit: 2 });
    const second = await listTransactions(app, tokenA, { page: 2, limit: 2 });
    const idsOf = (res: request.Response): string[] =>
      res.body.data.transactions.map((t: { transactionId: string }) => t.transactionId);
    const overlap = idsOf(first).filter((id) => idsOf(second).includes(id));
    expect(overlap).toEqual([]);
  });

  it('lists newest first', async () => {
    const payload = buildPayload();
    const created = createdData(await postTransaction(app, tokenA, { ...payload }));
    const res = await listTransactions(app, tokenA, { page: 1, limit: 5 });
    expect(res.body.data.transactions[0].transactionId).toBe(created.transactionId);
  });

  it('defaults to page 1 when no query is given', async () => {
    const res = await listTransactions(app, tokenA);
    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
  });
});

describe('GET /api/v1/ledger/transactions/:id', () => {
  it('returns the detail contract', async () => {
    const payload = buildPayload({ description: 'Detail view check' });
    const created = createdData(await postTransaction(app, tokenA, { ...payload }));

    const res = await getTransaction(app, tokenA, created.transactionId);

    expect(res.status).toBe(200);
    expect(isTransactionDetailResponse(res.body)).toBe(true);
    expect(res.body.data).toMatchObject({
      transactionId: created.transactionId,
      eventId: payload.eventId,
      status: 'COMPLETED',
      amount: 1000,
      currency: 'INR',
      description: 'Detail view check',
    });
  });

  it('answers 404 TRANSACTION_NOT_FOUND for an unknown id', async () => {
    const res = await getTransaction(app, tokenA, 'txn_does_not_exist');
    expectError(res, LEDGER_STATUS.notFound, LEDGER_ERROR_CODES.transactionNotFound);
  });

  it('answers 404 (not 403) for an id that belongs to another tenant', async () => {
    const created = createdData(await postTransaction(app, tokenA, { ...buildPayload() }));
    const res = await getTransaction(app, tokenB, created.transactionId);
    expectError(res, LEDGER_STATUS.notFound, LEDGER_ERROR_CODES.transactionNotFound);
  });

  it('does not treat odd ids as query operators', async () => {
    for (const id of ['{"$ne":null}', '$where', '..%2F..%2Fetc', '%00']) {
      const res = await getTransaction(app, tokenA, id);
      expect([LEDGER_STATUS.notFound, LEDGER_STATUS.validation]).toContain(res.status);
      expect(isApiErrorResponse(res.body)).toBe(true);
    }
  });
});

describe('GET /api/v1/ledger/summary', () => {
  it('returns the summary contract', async () => {
    const res = await getSummary(app, tokenA);
    expect(res.status).toBe(200);
    expect(isLedgerSummaryResponse(res.body)).toBe(true);
    expect(res.body.data.currency).toBe('INR');
  });

  it('adds exactly one transaction and its amount after one payment', async () => {
    const before = await readSummary(app, tokenA);
    await postTransaction(app, tokenA, { ...buildPayload({ amount: 2500 }) });
    const after = await readSummary(app, tokenA);

    expect(after.totalTransactions).toBe(before.totalTransactions + 1);
    expect(after.successfulTransactions).toBe(before.successfulTransactions + 1);
    expect(after.totalAmount).toBe(before.totalAmount + 2500);
    expect(after.failedTransactions).toBe(before.failedTransactions);
  });

  it('is not changed by a duplicate request', async () => {
    const payload = buildPayload({ amount: 1800 });
    await postTransaction(app, tokenA, { ...payload });
    const before = await readSummary(app, tokenA);
    await postTransaction(app, tokenA, { ...payload });
    await postTransaction(app, tokenA, { ...payload });
    expect(await readSummary(app, tokenA)).toEqual(before);
  });
});

describe('tenant isolation (Company A vs Company B)', () => {
  it('Company A writes change only Company A', async () => {
    const beforeA = await readSummary(app, tokenA);
    const beforeB = await readSummary(app, tokenB);

    await postTransaction(app, tokenA, { ...buildPayload({ amount: 3300 }) });

    const afterA = await readSummary(app, tokenA);
    const afterB = await readSummary(app, tokenB);
    expect(afterA.totalAmount).toBe(beforeA.totalAmount + 3300);
    expect(afterB).toEqual(beforeB);
  });

  it('Company B writes change only Company B', async () => {
    const beforeA = await readSummary(app, tokenA);
    const beforeB = await readSummary(app, tokenB);

    await postTransaction(app, tokenB, { ...buildPayload({ amount: 4400 }) });

    expect(await readSummary(app, tokenA)).toEqual(beforeA);
    expect((await readSummary(app, tokenB)).totalAmount).toBe(beforeB.totalAmount + 4400);
  });

  it("Company B's list never contains Company A's events", async () => {
    const payload = buildPayload();
    await postTransaction(app, tokenA, { ...payload });
    const res = await listTransactions(app, tokenB, { page: 1, limit: 50 });
    const eventIds: string[] = res.body.data.transactions.map(
      (t: { eventId: string }) => t.eventId,
    );
    expect(eventIds).not.toContain(payload.eventId);
  });

  it('a tenant claim edited inside the token is rejected', async () => {
    const forged = tokenA.split('.');
    const body = JSON.parse(Buffer.from(forged[1] ?? '', 'base64url').toString('utf8')) as object;
    const edited = Buffer.from(JSON.stringify({ ...body, tenantId: 'company_B' })).toString(
      'base64url',
    );
    const res = await request(app)
      .get(LEDGER_ROUTES.transactions)
      .set('Authorization', `Bearer ${forged[0]}.${edited}.${forged[2]}`);
    expect(res.status).toBe(401);
  });
});

describe('error handling', () => {
  it('returns 400 (not 500) for malformed JSON', async () => {
    const res = await request(app)
      .post(LEDGER_ROUTES.transactions)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Idempotency-Key', 'evt_bad_json')
      .set('Content-Type', 'application/json')
      .send('{"eventId": "evt_bad_json", ');
    expect(res.status).toBe(400);
    expect(isApiErrorResponse(res.body)).toBe(true);
  });

  it('returns 400 for an empty body', async () => {
    const res = await postTransaction(app, tokenA, {}, { idempotencyKey: 'evt_empty_body' });
    expect(res.status).toBe(400);
    expect(isApiErrorResponse(res.body)).toBe(true);
  });

  it('does not leak stack traces or database details in errors', async () => {
    const res = await postTransaction(app, tokenA, { amount: 'x' }, { idempotencyKey: 'evt_leak' });
    const raw = JSON.stringify(res.body);
    expect(raw).not.toMatch(/at .*\.ts:\d+|node_modules|mongodb:\/\/|MongoServerError/);
  });

  it('keeps unknown ledger routes in the standard 404 shape', async () => {
    const res = await request(app)
      .get('/api/v1/ledger/nope')
      .set('Authorization', `Bearer ${tokenA}`);
    expectError(res, 404, 'NOT_FOUND');
  });
});
