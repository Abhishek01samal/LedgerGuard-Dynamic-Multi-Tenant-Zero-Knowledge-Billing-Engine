import './../test-support/test-env';
import express, { type Express, type RequestHandler } from 'express';
import type { Connection } from 'mongoose';
import request from 'supertest';
import { AppError, errorHandler } from '../../../middleware/error.middleware';
import { getLedgerModels } from '../ledger.model';
import { createLedgerRouter } from '../ledger.routes';
import { LedgerService, type LedgerServiceOptions } from '../ledger.service';
import type { CreateTransactionInput, TenantContext } from '../ledger.types';
import { describeDb, dropAndClose, openTestConnection } from '../test-support/test-db';

const input = (over: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
  eventId: 'evt_fail_001',
  description: 'Failure scenario',
  amount: 500,
  currency: 'INR',
  debitAccount: 'customer_001',
  creditAccount: 'merchant_001',
  ...over,
});

const fakeAuth: RequestHandler = (req, _res, next) => {
  req.auth = { sub: 'user_001', email: 'a@x.com', tenantId: 'company_A', role: 'admin' };
  next();
};

describeDb('ledger failure handling & rollback (needs a MongoDB replica set)', () => {
  let conn: Connection;
  let ctx: TenantContext;

  const counts = async (): Promise<{ tx: number; entries: number; completed: number; failed: number }> => {
    const m = getLedgerModels(conn);
    return {
      tx: await m.Transaction.countDocuments(),
      entries: await m.Entry.countDocuments(),
      completed: await m.Transaction.countDocuments({ status: 'COMPLETED' }),
      failed: await m.Transaction.countDocuments({ status: 'FAILED' }),
    };
  };
  const rejection = async (p: Promise<unknown>): Promise<AppError> => {
    const e: unknown = await p.then(() => undefined, (x: unknown) => x);
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  };

  beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    conn = await openTestConnection('failures');
    ctx = { connection: conn, tenantId: 'company_A', userId: 'user_001' };
  }, 20_000);
  afterAll(() => dropAndClose(conn));
  beforeEach(async () => {
    const m = getLedgerModels(conn);
    await Promise.all([m.Transaction.deleteMany({}), m.Entry.deleteMany({})]);
  });

  it('IMBALANCE: a missing credit entry is detected inside the txn and everything rolls back', async () => {
    const service = new LedgerService({
      hooks: {
        afterEntriesWritten: async (_p, session) => {
          await getLedgerModels(conn).Entry.deleteOne({ entryType: 'CREDIT' }, { session });
        },
      },
    });
    const err = await rejection(service.createTransaction(ctx, input(), 'evt_fail_001'));
    expect(err).toMatchObject({ statusCode: 422, code: 'LEDGER_IMBALANCE' });
    expect(err.data).toMatchObject({ status: 'FAILED', rolledBack: true });
    expect(await counts()).toEqual({ tx: 1, entries: 0, completed: 0, failed: 1 });
  });

  it('IMBALANCE: a wrong amount on one side is detected and rolled back', async () => {
    const service = new LedgerService({
      hooks: {
        afterEntriesWritten: async (_p, session) => {
          await getLedgerModels(conn).Entry.updateOne({ entryType: 'DEBIT' }, { $set: { amountMinor: 1 } }, { session });
        },
      },
    });
    await rejection(service.createTransaction(ctx, input(), 'evt_fail_001'));
    expect(await counts()).toEqual({ tx: 1, entries: 0, completed: 0, failed: 1 });
  });

  it('DEMO ACCOUNT: writes are rolled back, a FAILED row is stored, status is 422', async () => {
    const service = new LedgerService({ demoFailAccount: 'fail_account' });
    const err = await rejection(service.createTransaction(ctx, input({ creditAccount: 'fail_account' }), 'evt_fail_001'));
    expect(err.statusCode).toBe(422);
    expect(err.data).toMatchObject({ eventId: 'evt_fail_001', status: 'FAILED', amount: 500, currency: 'INR', rolledBack: true });
    expect(await counts()).toEqual({ tx: 1, entries: 0, completed: 0, failed: 1 });
  });

  it('DEMO ACCOUNT does nothing when explicitly disabled (even if a developer set it in .env)', async () => {
    const service = new LedgerService({ demoFailAccount: '' });
    await service.createTransaction(ctx, input({ creditAccount: 'fail_account' }), 'evt_fail_001');
    expect(await counts()).toEqual({ tx: 1, entries: 2, completed: 1, failed: 0 });
  });

  it('repeating the failing request keeps failing cleanly (no duplicate rows, attempts increments)', async () => {
    const service = new LedgerService({ demoFailAccount: 'fail_account' });
    for (let i = 0; i < 3; i += 1) {
      await rejection(service.createTransaction(ctx, input({ creditAccount: 'fail_account' }), 'evt_fail_001'));
    }
    expect(await counts()).toEqual({ tx: 1, entries: 0, completed: 0, failed: 1 });
    expect(await getLedgerModels(conn).Transaction.findOne({})).toMatchObject({ attempts: 3 });
  });

  it('after a failure, a DIFFERENT payload on the same key is still a 409 (key is bound to its first payload)', async () => {
    const failing = new LedgerService({ demoFailAccount: 'fail_account' });
    await rejection(failing.createTransaction(ctx, input({ creditAccount: 'fail_account' }), 'evt_fail_001'));
    const err = await rejection(new LedgerService({ demoFailAccount: '' }).createTransaction(ctx, input({ amount: 999 }), 'evt_fail_001'));
    expect(err.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('a failed event does not block other events and later counts in the summary as failed', async () => {
    const options: LedgerServiceOptions = { demoFailAccount: 'fail_account' };
    const service = new LedgerService(options);
    await rejection(service.createTransaction(ctx, input({ creditAccount: 'fail_account' }), 'evt_fail_001'));
    await service.createTransaction(ctx, input({ eventId: 'evt_ok_002', amount: 120 }), 'evt_ok_002');
    expect(await service.getSummary(ctx, 'INR')).toEqual({
      totalTransactions: 2,
      successfulTransactions: 1,
      failedTransactions: 1,
      totalAmount: 120, // the failed 500 is NOT counted
      currency: 'INR',
    });
  });

  it('a mid-flight crash between the two entries leaves no half-written ledger', async () => {
    const m = getLedgerModels(conn);
    const spy = jest.spyOn(m.Entry, 'insertMany').mockRejectedValueOnce(new Error('connection reset'));
    const err = await rejection(new LedgerService({ demoFailAccount: '' }).createTransaction(ctx, input(), 'evt_fail_001'));
    expect(err).toMatchObject({ statusCode: 500, code: 'TRANSACTION_FAILED' });
    spy.mockRestore();
    expect(await counts()).toEqual({ tx: 1, entries: 0, completed: 0, failed: 1 });
    // client retries with the SAME key and succeeds, completing the same transaction
    const retry = await new LedgerService({ demoFailAccount: '' }).createTransaction(ctx, input(), 'evt_fail_001');
    expect(retry.transaction.status).toBe('COMPLETED');
    expect(await counts()).toEqual({ tx: 1, entries: 2, completed: 1, failed: 0 });
  });

  describe('over HTTP (what the React rollback state consumes)', () => {
    let app: Express;
    beforeAll(() => {
      app = express();
      app.use(express.json());
      app.use(
        '/api/v1/ledger',
        fakeAuth,
        createLedgerRouter({ service: new LedgerService({ demoFailAccount: 'fail_account' }), getConnection: () => Promise.resolve(conn) }),
      );
      app.use(errorHandler);
    });

    it('returns 422 with success:false and a data block describing the rollback', async () => {
      const res = await request(app)
        .post('/api/v1/ledger/transactions')
        .set('Idempotency-Key', 'evt_http_fail_1')
        .send({ ...input({ eventId: 'evt_http_fail_1', creditAccount: 'fail_account' }) });
      expect(res.status).toBe(422);
      expect(res.body).toEqual({
        success: false,
        message: 'Simulated failure: the ledger write was rolled back',
        code: 'TRANSACTION_FAILED',
        data: {
          transactionId: expect.stringMatching(/^txn_/),
          eventId: 'evt_http_fail_1',
          status: 'FAILED',
          amount: 500,
          currency: 'INR',
          failureReason: 'Simulated failure: the ledger write was rolled back',
          rolledBack: true,
        },
      });
      const list = await request(app).get('/api/v1/ledger/transactions?status=FAILED');
      expect(list.body.data.transactions[0]).toMatchObject({ eventId: 'evt_http_fail_1', status: 'FAILED' });
      const detail = await request(app).get(`/api/v1/ledger/transactions/${res.body.data.transactionId as string}`);
      expect(detail.body.data.entries).toEqual([]); // nothing was written to the ledger
    });

    it.each([
      ['zero amount', { amount: 0 }],
      ['negative amount', { amount: -10 }],
      ['non-numeric amount', { amount: 'abc' }],
      ['3 decimal places', { amount: 1.005 }],
      ['same debit and credit account', { creditAccount: 'customer_001' }],
      ['malformed account', { debitAccount: 'bad account!' }],
      ['unsupported currency', { currency: 'BTC' }],
    ])('invalid input (%s) -> 400 and NOTHING is written', async (_n, patch) => {
      const before = await counts();
      const res = await request(app)
        .post('/api/v1/ledger/transactions')
        .set('Idempotency-Key', 'evt_invalid_1')
        .send({ ...input({ eventId: 'evt_invalid_1' }), ...patch });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(await counts()).toEqual(before);
    });
  });
});
