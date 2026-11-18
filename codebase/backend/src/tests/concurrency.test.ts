import mongoose from 'mongoose';
import { createApp } from '../app';
import { LEDGER_ERROR_CODES, LEDGER_STATUS } from '../../../shared/contracts/ledger.contract';
import {
  buildPayload,
  createdData,
  getTransaction,
  postTransaction,
  tokenFor,
  totalTransactions,
} from './helpers/ledger.helpers';

const app = createApp();
const tokenA = tokenFor('A');

afterAll(async () => {
  await mongoose.disconnect();
});

const PARALLEL = 10;

describe('concurrent duplicate requests (same key, same payload)', () => {
  it('creates exactly one ledger entry when 10 identical requests arrive together', async () => {
    const payload = buildPayload({ amount: 7700 });
    const before = await totalTransactions(app, tokenA);

    const responses = await Promise.all(
      Array.from({ length: PARALLEL }, () => postTransaction(app, tokenA, { ...payload })),
    );

    const created = responses.filter((r) => r.status === LEDGER_STATUS.created);
    const replayed = responses.filter((r) => r.status === LEDGER_STATUS.replayed);
    const inProgress = responses.filter((r) => r.status === LEDGER_STATUS.conflict);

    // Exactly one request did the work. Every other one was a replay or a retryable conflict.
    expect(created).toHaveLength(1);
    expect(created.length + replayed.length + inProgress.length).toBe(PARALLEL);
    for (const res of inProgress) {
      expect(res.body.code).toBe(LEDGER_ERROR_CODES.requestInProgress);
    }

    // All successful answers point at the same transaction.
    const winnerResponse = created[0] ?? responses[0];
    if (!winnerResponse) throw new Error('expected at least one response');
    const winner = createdData(winnerResponse);
    for (const res of replayed) {
      expect(createdData(res).transactionId).toBe(winner.transactionId);
    }

    // The database holds one entry, and a later retry returns the stored result.
    expect(await totalTransactions(app, tokenA)).toBe(before + 1);
    const retry = await postTransaction(app, tokenA, { ...payload });
    expect(retry.status).toBe(LEDGER_STATUS.replayed);
    expect(createdData(retry).transactionId).toBe(winner.transactionId);
  });

  it('lets only one of 10 same-key requests with DIFFERENT payloads win', async () => {
    const base = buildPayload();
    const before = await totalTransactions(app, tokenA);

    const responses = await Promise.all(
      Array.from({ length: PARALLEL }, (_unused, i) =>
        postTransaction(app, tokenA, { ...base, amount: 1000 + i }),
      ),
    );

    const winners = responses.filter((r) => r.status === LEDGER_STATUS.created);
    const rejected = responses.filter((r) => r.status === LEDGER_STATUS.conflict);
    expect(winners).toHaveLength(1);
    expect(winners.length + rejected.length).toBe(PARALLEL);
    expect(await totalTransactions(app, tokenA)).toBe(before + 1);

    // The stored amount is the winner's amount, never a mix.
    const winResponse = winners[0] ?? responses[0];
    if (!winResponse) throw new Error('expected at least one response');
    const win = createdData(winResponse);
    const stored = await getTransaction(app, tokenA, win.transactionId);
    expect(stored.body.data.amount).toBe(win.amount);
  });
});

describe('concurrent distinct events', () => {
  it('records 20 different events that arrive together, each exactly once', async () => {
    const before = await totalTransactions(app, tokenA);

    const responses = await Promise.all(
      Array.from({ length: 20 }, () => postTransaction(app, tokenA, { ...buildPayload() })),
    );

    expect(responses.every((r) => r.status === LEDGER_STATUS.created)).toBe(true);
    const ids = new Set(responses.map((r) => createdData(r).transactionId));
    expect(ids.size).toBe(20);
    expect(await totalTransactions(app, tokenA)).toBe(before + 20);
  });
});
