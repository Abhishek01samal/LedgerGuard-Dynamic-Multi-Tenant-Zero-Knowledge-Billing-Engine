import './../test-support/test-env';
import express, { type Express, type RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { errorHandler, notFoundHandler } from '../../../middleware/error.middleware';
import { requireAuth } from '../../../middleware/auth.middleware';
import { getLedgerModels } from '../ledger.model';
import { createLedgerRouter } from '../ledger.routes';
import { LedgerService } from '../ledger.service';
import { describeDb, dropAndClose, openTestConnection } from '../test-support/test-db';

/** Stand-in for requireAuth: the token claims are what the real middleware would verify. */
const fakeAuth =
  (tenantId: string, userId: string): RequestHandler =>
  (req, _res, next) => {
    req.auth = { sub: userId, email: `${userId}@x.com`, tenantId, role: 'admin' };
    next();
  };

const body = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  eventId: 'evt_companyA_001',
  description: 'Monthly subscription payment',
  amount: 1000,
  currency: 'INR',
  debitAccount: 'customer_001',
  creditAccount: 'merchant_001',
  ...over,
});

describeDb('ledger HTTP API (needs a MongoDB replica set)', () => {
  let connA: Connection;
  let connB: Connection;
  let appA: Express;
  let appB: Express;

  const build = (conn: Connection, tenantId: string, userId: string): Express => {
    const app = express();
    app.use(express.json());
    app.use(
      '/api/v1/ledger',
      fakeAuth(tenantId, userId),
      createLedgerRouter({ service: new LedgerService(), getConnection: () => Promise.resolve(conn) }),
    );
    app.use(notFoundHandler);
    app.use(errorHandler);
    return app;
  };

  beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    connA = await openTestConnection('http_a');
    connB = await openTestConnection('http_b');
    appA = build(connA, 'company_A', 'user_001');
    appB = build(connB, 'company_B', 'user_002');
  }, 20_000);
  afterAll(() => dropAndClose(connA, connB));
  beforeEach(async () => {
    for (const c of [connA, connB]) {
      const m = getLedgerModels(c);
      await Promise.all([m.Transaction.deleteMany({}), m.Entry.deleteMany({})]);
    }
  });

  const post = (app: Express, payload: Record<string, unknown>, key?: string) =>
    request(app)
      .post('/api/v1/ledger/transactions')
      .set('Idempotency-Key', key ?? String(payload.eventId))
      .send(payload);

  it('POST creates (201) with exactly the frozen contract shape', async () => {
    const res = await post(appA, body());
    expect(res.status).toBe(201);
    expect(res.headers['idempotent-replayed']).toBe('false');
    expect(res.body).toEqual({
      success: true,
      message: 'Transaction completed',
      data: {
        transactionId: expect.stringMatching(/^txn_/),
        eventId: 'evt_companyA_001',
        status: 'COMPLETED',
        amount: 1000,
        currency: 'INR',
      },
    });
  });

  it('POST replay returns 200 with the same transaction', async () => {
    const first = await post(appA, body());
    const again = await post(appA, body());
    expect(again.status).toBe(200);
    expect(again.headers['idempotent-replayed']).toBe('true');
    expect(again.body.data).toEqual(first.body.data);
  });

  it('POST same key + different payload -> 409', async () => {
    await post(appA, body());
    const res = await post(appA, body({ amount: 5 }));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ success: false, code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it('POST validation: missing key header, bad body, mismatch', async () => {
    const noKey = await request(appA).post('/api/v1/ledger/transactions').send(body());
    expect(noKey.status).toBe(400);
    expect((await post(appA, body({ amount: -1 }))).status).toBe(400);
    const mismatch = await post(appA, body(), 'evt_different_9');
    expect(mismatch.status).toBe(400);
    expect(mismatch.body.code).toBe('IDEMPOTENCY_KEY_MISMATCH');
  });

  it('GET list paginates, filters and sorts newest first', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await post(appA, body({ eventId: `evt_list_${i}`, description: i % 2 ? 'Subscription' : 'Refund', amount: i * 10 }));
    }
    const page1 = await request(appA).get('/api/v1/ledger/transactions?page=1&limit=2');
    expect(page1.status).toBe(200);
    expect(page1.body.data.pagination).toEqual({ page: 1, limit: 2, total: 5, totalPages: 3 });
    expect(page1.body.data.transactions.map((t: { eventId: string }) => t.eventId)).toEqual(['evt_list_5', 'evt_list_4']);

    const page3 = await request(appA).get('/api/v1/ledger/transactions?page=3&limit=2');
    expect(page3.body.data.transactions).toHaveLength(1);

    const search = await request(appA).get('/api/v1/ledger/transactions?search=refund');
    expect(search.body.data.pagination.total).toBe(2);
    const status = await request(appA).get('/api/v1/ledger/transactions?status=FAILED');
    expect(status.body.data.pagination).toMatchObject({ total: 0, totalPages: 0 });
    const regexAttack = await request(appA).get('/api/v1/ledger/transactions?search=.*');
    expect(regexAttack.body.data.pagination.total).toBe(0); // escaped, not a wildcard
    expect((await request(appA).get('/api/v1/ledger/transactions?limit=1000')).status).toBe(400);
  });

  it('GET one returns details with both ledger entries; unknown id -> 404', async () => {
    const created = await post(appA, body());
    const id = created.body.data.transactionId as string;
    const res = await request(appA).get(`/api/v1/ledger/transactions/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ transactionId: id, description: 'Monthly subscription payment', status: 'COMPLETED' });
    expect(res.body.data.entries).toEqual([
      { accountId: 'customer_001', entryType: 'DEBIT', amount: 1000, currency: 'INR' },
      { accountId: 'merchant_001', entryType: 'CREDIT', amount: 1000, currency: 'INR' },
    ]);
    expect((await request(appA).get('/api/v1/ledger/transactions/txn_missing')).status).toBe(404);
    expect((await request(appA).get('/api/v1/ledger/transactions/..%2Fetc')).status).toBe(400);
  });

  it('GET summary counts only completed money', async () => {
    await post(appA, body({ eventId: 'evt_sum_1', amount: 100 }));
    await post(appA, body({ eventId: 'evt_sum_2', amount: 250.5 }));
    await post(appA, body({ eventId: 'evt_sum_3', amount: 9, currency: 'USD' }));
    const res = await request(appA).get('/api/v1/ledger/summary');
    expect(res.body).toEqual({
      success: true,
      data: { totalTransactions: 2, successfulTransactions: 2, failedTransactions: 0, totalAmount: 350.5, currency: 'INR' },
    });
    const usd = await request(appA).get('/api/v1/ledger/summary?currency=USD');
    expect(usd.body.data).toMatchObject({ totalTransactions: 1, totalAmount: 9, currency: 'USD' });
  });

  it('TENANT ISOLATION over HTTP: B cannot list, read or summarise A', async () => {
    const created = await post(appA, body());
    const id = created.body.data.transactionId as string;

    expect((await request(appB).get('/api/v1/ledger/transactions')).body.data.pagination.total).toBe(0);
    expect((await request(appB).get(`/api/v1/ledger/transactions/${id}`)).status).toBe(404);
    expect((await request(appB).get('/api/v1/ledger/summary')).body.data.totalTransactions).toBe(0);

    // B may reuse A's eventId: it is a different tenant, therefore a brand-new transaction.
    const b = await post(appB, body({ amount: 7 }));
    expect(b.status).toBe(201);
    expect(b.body.data.transactionId).not.toBe(id);
  });

  it('ignores a tenantId smuggled in headers/query/body', async () => {
    await post(appA, body());
    const res = await request(appB).get('/api/v1/ledger/transactions?tenantId=company_A').set('X-Tenant-Id', 'company_A');
    expect(res.body.data.pagination.total).toBe(0);
    const smuggled = await post(appB, { ...body({ eventId: 'evt_smuggle_1' }), tenantId: 'company_A' });
    expect(smuggled.status).toBe(400); // unknown field rejected by .strict()
  });

  it('requireAuth is still the gate in app.ts (no token -> 401)', async () => {
    const app = express();
    app.use('/api/v1/ledger', requireAuth, createLedgerRouter({ service: new LedgerService(), getConnection: () => Promise.resolve(connA) }));
    app.use(errorHandler);
    expect((await request(app).get('/api/v1/ledger/transactions')).status).toBe(401);
  });
});
