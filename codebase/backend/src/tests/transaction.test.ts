import mongoose from 'mongoose';
import { createApp } from '../app';
import {
  LEDGER_ERROR_CODES,
  LEDGER_STATUS,
  isTransactionDetailResponse,
} from '../../../shared/contracts/ledger.contract';
import { assertReplicaSet, withScratchDatabase } from './helpers/test-database';
import {
  buildPayload,
  createdData,
  expectError,
  getTransaction,
  postTransaction,
  readSummary,
  tokenFor,
  totalTransactions,
} from './helpers/ledger.helpers';

const app = createApp();
const tokenA = tokenFor('A');

afterAll(async () => {
  await mongoose.disconnect();
});

/**
 * Day 2: proves the TEST DATABASE can do what the ledger needs, before any ledger code runs.
 * If these fail, fix the environment (docker-compose.yml) - not the ledger service.
 */
describe('MongoDB replica set (infrastructure)', () => {
  it('is a replica set with a writable primary', async () => {
    const info = await assertReplicaSet();
    expect(info.setName).toBe('rs0');
    expect(info.isWritablePrimary).toBe(true);
  });

  it('commits a multi-document transaction atomically', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      const session = await connection.startSession();
      try {
        await session.withTransaction(async () => {
          await entries.insertOne({ account: 'customer_001', type: 'DEBIT' }, { session });
          await entries.insertOne({ account: 'merchant_001', type: 'CREDIT' }, { session });
        });
      } finally {
        await session.endSession();
      }
      expect(await entries.countDocuments()).toBe(2);
    });
  });

  it('rolls back every write when the transaction aborts', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      await entries.insertOne({ account: 'seed', type: 'DEBIT' }); // creates the collection
      const session = await connection.startSession();
      try {
        session.startTransaction();
        await entries.insertOne({ account: 'customer_001', type: 'DEBIT' }, { session });
        await entries.insertOne({ account: 'merchant_001', type: 'CREDIT' }, { session });
        await session.abortTransaction();
      } finally {
        await session.endSession();
      }
      expect(await entries.countDocuments()).toBe(1); // only the seed row survived
    });
  });

  it('rolls back the first write when the second one fails (duplicate key)', async () => {
    await withScratchDatabase(async (connection) => {
      const entries = connection.collection('entries');
      await entries.createIndex({ eventId: 1, side: 1 }, { unique: true });
      await entries.insertOne({ eventId: 'evt_x', side: 'CREDIT' }); // pre-existing credit

      const session = await connection.startSession();
      let failed = false;
      try {
        await session.withTransaction(async () => {
          await entries.insertOne({ eventId: 'evt_x', side: 'DEBIT' }, { session });
          await entries.insertOne({ eventId: 'evt_x', side: 'CREDIT' }, { session }); // duplicate
        });
      } catch {
        failed = true;
      } finally {
        await session.endSession();
      }

      expect(failed).toBe(true);
      expect(await entries.countDocuments({ eventId: 'evt_x' })).toBe(1); // the DEBIT rolled back
    });
  });
});

/** Day 3: the same guarantees through the real ledger API. */
describe('ledger transaction commit', () => {
  it('commits a successful transaction and makes it durable and readable', async () => {
    const payload = buildPayload();
    const before = await totalTransactions(app, tokenA);

    const res = await postTransaction(app, tokenA, { ...payload });

    expect(res.status).toBe(LEDGER_STATUS.created);
    const data = createdData(res);
    expect(data.status).toBe('COMPLETED');
    expect(await totalTransactions(app, tokenA)).toBe(before + 1);

    const detail = await getTransaction(app, tokenA, data.transactionId);
    expect(detail.status).toBe(200);
    expect(isTransactionDetailResponse(detail.body)).toBe(true);
    expect(detail.body.data.eventId).toBe(payload.eventId);
  });
});

describe('ledger rollback', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rolls everything back when the commit fails, then recovers on retry with the same key', async () => {
    const payload = buildPayload({ amount: 4200 });
    const before = await readSummary(app, tokenA);

    // Simulated failure at the very last step: both entries were written, the commit throws.
    const commit = jest
      .spyOn(mongoose.mongo.ClientSession.prototype, 'commitTransaction')
      .mockRejectedValueOnce(new Error('simulated commit failure'));

    const failed = await postTransaction(app, tokenA, { ...payload });

    expect(commit).toHaveBeenCalled();
    expectError(failed, LEDGER_STATUS.failed, LEDGER_ERROR_CODES.transactionFailed);

    // Nothing was committed: no money moved, no COMPLETED transaction was created.
    const afterFailure = await readSummary(app, tokenA);
    expect(afterFailure.totalAmount).toBe(before.totalAmount);
    expect(afterFailure.successfulTransactions).toBe(before.successfulTransactions);

    // The client retries with the SAME key. Either it is processed now (201), or the stored
    // FAILED result is replayed (200). Money must move at most once.
    const retry = await postTransaction(app, tokenA, { ...payload });
    expect([LEDGER_STATUS.created, LEDGER_STATUS.replayed]).toContain(retry.status);
    const data = createdData(retry);
    const afterRetry = await readSummary(app, tokenA);
    const committed = data.status === 'COMPLETED' ? 1 : 0;
    expect(afterRetry.successfulTransactions).toBe(before.successfulTransactions + committed);
    expect(afterRetry.totalAmount).toBe(before.totalAmount + committed * payload.amount);
  });
});

describe('invalid input never reaches the ledger', () => {
  it.each([
    ['zero amount', { amount: 0 }],
    ['negative amount', { amount: -500 }],
    ['fractional amount', { amount: 10.5 }],
    ['string amount', { amount: '1000' }],
    ['null amount', { amount: null }],
    ['unknown currency format', { currency: 'RUPEES' }],
    ['empty description', { description: '' }],
    ['empty debit account', { debitAccount: '' }],
    ['empty credit account', { creditAccount: '' }],
    ['same debit and credit account', { debitAccount: 'acct_1', creditAccount: 'acct_1' }],
  ])('rejects %s with 400 and writes nothing', async (_name, change) => {
    const payload = { ...buildPayload(), ...change };
    const before = await totalTransactions(app, tokenA);

    const res = await postTransaction(app, tokenA, payload);

    expectError(res, LEDGER_STATUS.validation, LEDGER_ERROR_CODES.validation);
    expect(await totalTransactions(app, tokenA)).toBe(before);
  });

  it('rejects a body with missing required fields', async () => {
    const eventId = buildPayload().eventId;
    const res = await postTransaction(app, tokenA, { eventId });
    expectError(res, LEDGER_STATUS.validation, LEDGER_ERROR_CODES.validation);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
