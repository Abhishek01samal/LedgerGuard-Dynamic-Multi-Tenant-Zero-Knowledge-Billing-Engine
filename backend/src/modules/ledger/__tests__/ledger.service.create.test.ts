import './../test-support/test-env';
import type { Connection } from 'mongoose';
import { AppError } from '../../../middleware/error.middleware';
import { LockUnavailableError } from '../ledger.errors';
import { InMemoryIdempotencyGuard } from '../ledger.guard';
import { getLedgerModels } from '../ledger.model';
import { LedgerService } from '../ledger.service';
import type { CreateTransactionInput, IdempotencyGuard, TenantContext } from '../ledger.types';
import { describeDb, dropAndClose, openTestConnection } from '../test-support/test-db';

const input = (over: Partial<CreateTransactionInput> = {}): CreateTransactionInput => ({
  eventId: 'evt_companyA_001',
  description: 'Monthly subscription payment',
  amount: 1000,
  currency: 'INR',
  debitAccount: 'customer_001',
  creditAccount: 'merchant_001',
  ...over,
});

/** Simulates "Redis is down / lock expired": no mutual exclusion at all. */
const noLockGuard: IdempotencyGuard = { runExclusive: (_k, work) => work() };

async function expectAppError(p: Promise<unknown>, status: number, code: string): Promise<AppError> {
  const err: unknown = await p.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(AppError);
  const app = err as AppError;
  expect(app.statusCode).toBe(status);
  expect(app.code).toBe(code);
  return app;
}

describeDb('LedgerService.createTransaction (needs a MongoDB replica set)', () => {
  let connA: Connection;
  let connB: Connection;
  let ctxA: TenantContext;
  let ctxB: TenantContext;

  const count = async (conn: Connection): Promise<{ tx: number; entries: number; completed: number }> => {
    const m = getLedgerModels(conn);
    return {
      tx: await m.Transaction.countDocuments(),
      entries: await m.Entry.countDocuments(),
      completed: await m.Transaction.countDocuments({ status: 'COMPLETED' }),
    };
  };

  beforeAll(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined); // expected rollback logs
    connA = await openTestConnection('create_a');
    connB = await openTestConnection('create_b');
    ctxA = { connection: connA, tenantId: 'company_A', userId: 'user_001' };
    ctxB = { connection: connB, tenantId: 'company_B', userId: 'user_002' };
  }, 20_000);

  afterAll(() => dropAndClose(connA, connB));

  beforeEach(async () => {
    for (const conn of [connA, connB]) {
      const m = getLedgerModels(conn);
      await Promise.all([m.Transaction.deleteMany({}), m.Entry.deleteMany({})]);
    }
  });

  it('writes the transaction plus a DEBIT and a CREDIT entry atomically', async () => {
    const service = new LedgerService();
    const { transaction, replayed } = await service.createTransaction(ctxA, input(), 'evt_companyA_001');

    expect(replayed).toBe(false);
    expect(transaction).toMatchObject({ eventId: 'evt_companyA_001', status: 'COMPLETED', amount: 1000, currency: 'INR' });
    expect(transaction.transactionId).toMatch(/^txn_/);

    const m = getLedgerModels(connA);
    const entries = await m.Entry.find({ transactionId: transaction.transactionId }).lean();
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.entryType === 'DEBIT')).toMatchObject({ accountId: 'customer_001', amountMinor: 100000 });
    expect(entries.find((e) => e.entryType === 'CREDIT')).toMatchObject({ accountId: 'merchant_001', amountMinor: 100000 });
  });

  it('same key + same payload returns the ORIGINAL result and creates nothing new', async () => {
    const service = new LedgerService();
    const first = await service.createTransaction(ctxA, input(), 'evt_companyA_001');
    const second = await service.createTransaction(ctxA, input(), 'evt_companyA_001');

    expect(second.replayed).toBe(true);
    expect(second.transaction).toEqual(first.transaction);
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
  });

  it('same key + different payload is rejected with 409 and nothing changes', async () => {
    const service = new LedgerService();
    await service.createTransaction(ctxA, input(), 'evt_companyA_001');
    await expectAppError(
      service.createTransaction(ctxA, input({ amount: 2000 }), 'evt_companyA_001'),
      409,
      'IDEMPOTENCY_KEY_REUSED',
    );
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
  });

  it('rejects an Idempotency-Key that differs from eventId', async () => {
    const service = new LedgerService();
    await expectAppError(service.createTransaction(ctxA, input(), 'evt_other_999'), 400, 'IDEMPOTENCY_KEY_MISMATCH');
    expect(await count(connA)).toEqual({ tx: 0, entries: 0, completed: 0 });
  });

  it('a different eventId is processed as a new transaction', async () => {
    const service = new LedgerService();
    await service.createTransaction(ctxA, input(), 'evt_companyA_001');
    await service.createTransaction(ctxA, input({ eventId: 'evt_companyA_002' }), 'evt_companyA_002');
    expect(await count(connA)).toEqual({ tx: 2, entries: 4, completed: 2 });
  });

  it('10 concurrent identical requests with the in-memory lock create exactly one transaction', async () => {
    const service = new LedgerService({ guard: new InMemoryIdempotencyGuard() });
    const results = await Promise.all(
      Array.from({ length: 10 }, () => service.createTransaction(ctxA, input(), 'evt_companyA_001')),
    );
    expect(new Set(results.map((r) => r.transaction.transactionId)).size).toBe(1);
    expect(results.filter((r) => !r.replayed)).toHaveLength(1);
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
  });

  it('REDIS DOWN: 10 concurrent requests with NO lock are still safe (unique index + txn)', async () => {
    const service = new LedgerService({ guard: noLockGuard });
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () => service.createTransaction(ctxA, input(), 'evt_companyA_001')),
    );
    const ok = results.filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<LedgerService['createTransaction']>>> => r.status === 'fulfilled');
    expect(ok.length).toBeGreaterThan(0);
    expect(new Set(ok.map((r) => r.value.transaction.transactionId)).size).toBe(1);
    // no failures other than a retryable "in progress"
    for (const r of results) {
      if (r.status === 'rejected') expect((r.reason as AppError).code).toBe('TRANSACTION_IN_PROGRESS');
    }
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
  });

  it('maps lock contention to a retryable 409', async () => {
    const busy: IdempotencyGuard = { runExclusive: () => Promise.reject(new LockUnavailableError()) };
    const service = new LedgerService({ guard: busy });
    await expectAppError(service.createTransaction(ctxA, input(), 'evt_companyA_001'), 409, 'TRANSACTION_IN_PROGRESS');
    expect(await count(connA)).toEqual({ tx: 0, entries: 0, completed: 0 });
  });

  it('ROLLBACK: a failure after both entries are written leaves NO ledger entries and a FAILED audit row', async () => {
    const service = new LedgerService({
      hooks: {
        afterEntriesWritten: () => {
          throw new Error('simulated crash before commit');
        },
      },
    });
    const err = await expectAppError(service.createTransaction(ctxA, input(), 'evt_companyA_001'), 500, 'TRANSACTION_FAILED');
    expect(err.data).toMatchObject({ eventId: 'evt_companyA_001', status: 'FAILED', rolledBack: true });
    expect(JSON.stringify(err.data)).not.toContain('simulated crash'); // no internals leaked

    expect(await count(connA)).toEqual({ tx: 1, entries: 0, completed: 0 });
    const m = getLedgerModels(connA);
    expect(await m.Transaction.findOne({ eventId: 'evt_companyA_001' })).toMatchObject({ status: 'FAILED', attempts: 1 });
  });

  it('retrying a FAILED event with the SAME key succeeds and completes the same transaction', async () => {
    let fail = true;
    const service = new LedgerService({
      hooks: {
        afterEntriesWritten: () => {
          if (fail) throw new Error('temporary');
        },
      },
    });
    const failed = await service.createTransaction(ctxA, input(), 'evt_companyA_001').catch((e: unknown) => e as AppError);
    const failedId = (failed as AppError).data as { transactionId: string };

    fail = false;
    const retry = await service.createTransaction(ctxA, input(), 'evt_companyA_001');
    expect(retry.replayed).toBe(false);
    expect(retry.transaction.transactionId).toBe(failedId.transactionId);
    expect(retry.transaction.status).toBe('COMPLETED');
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
    expect(await getLedgerModels(connA).Transaction.findOne({})).toMatchObject({ attempts: 2, failureReason: null });
  });

  it('TENANT ISOLATION: the same eventId in two tenants never collides or leaks', async () => {
    const service = new LedgerService();
    const a = await service.createTransaction(ctxA, input(), 'evt_companyA_001');
    const b = await service.createTransaction(ctxB, input({ amount: 55 }), 'evt_companyA_001');

    expect(a.transaction.transactionId).not.toBe(b.transaction.transactionId);
    expect(a.transaction.amount).toBe(1000);
    expect(b.transaction.amount).toBe(55);
    expect(await count(connA)).toEqual({ tx: 1, entries: 2, completed: 1 });
    expect(await count(connB)).toEqual({ tx: 1, entries: 2, completed: 1 });
    // Defence in depth: even a tenant-A context pointed at tenant-B's database never
    // sees or returns tenant-B's row, because tenantId is part of every query.
    const mixed: TenantContext = { connection: connB, tenantId: 'company_A', userId: 'user_001' };
    const crossed = await service.createTransaction(mixed, input({ amount: 77 }), 'evt_companyA_001');
    expect(crossed.replayed).toBe(false);
    expect(crossed.transaction.amount).toBe(77);
    expect(crossed.transaction.transactionId).not.toBe(b.transaction.transactionId);
  });
});
