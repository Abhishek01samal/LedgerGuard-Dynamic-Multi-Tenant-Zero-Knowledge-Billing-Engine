import Redis from 'ioredis';
import mongoose from 'mongoose';
import { createApp } from '../app';
import { LEDGER_ERROR_CODES, LEDGER_STATUS } from '../../../shared/contracts/ledger.contract';
import {
  buildPayload,
  createdData,
  getTransaction,
  listTransactions,
  postTransaction,
  readSummary,
  tokenFor,
  totalTransactions,
} from './helpers/ledger.helpers';
import { sleep } from './helpers/test-redis';

const app = createApp();
const tokenA = tokenFor('A');
const tokenB = tokenFor('B');

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

describe('fast tenant switching under load (isolation audit evidence)', () => {
  it('serves interleaved Company A and Company B traffic without mixing tenants', async () => {
    const perTenant = 25;
    const tagA = `evt_load_A_${Date.now()}`;
    const tagB = `evt_load_B_${Date.now()}`;
    const startedAt = performance.now();

    // Strictly alternating A, B, A, B ... so the connection layer switches tenant on every call.
    const writes = await Promise.all(
      Array.from({ length: perTenant * 2 }, (_unused, i) => {
        const isA = i % 2 === 0;
        const payload = buildPayload({ eventId: `${isA ? tagA : tagB}_${i}` });
        return postTransaction(app, isA ? tokenA : tokenB, { ...payload });
      }),
    );
    const elapsedMs = Math.round(performance.now() - startedAt);

    expect(writes.every((r) => r.status === LEDGER_STATUS.created)).toBe(true);

    // Each tenant sees only its own tagged events.
    const [listA, listB] = await Promise.all([
      listTransactions(app, tokenA, { page: 1, limit: 50 }),
      listTransactions(app, tokenB, { page: 1, limit: 50 }),
    ]);
    const idsA: string[] = listA.body.data.transactions.map((t: { eventId: string }) => t.eventId);
    const idsB: string[] = listB.body.data.transactions.map((t: { eventId: string }) => t.eventId);
    expect(idsA.some((id) => id.startsWith(tagB))).toBe(false);
    expect(idsB.some((id) => id.startsWith(tagA))).toBe(false);
    expect(idsA.filter((id) => id.startsWith(tagA)).length).toBeGreaterThan(0);
    expect(idsB.filter((id) => id.startsWith(tagB)).length).toBeGreaterThan(0);

    // Trace line for the mid-project review (screenshot this output).
    console.info(
      `[isolation-trace] ${perTenant * 2} interleaved A/B writes in ${elapsedMs} ms ` +
        `(${(elapsedMs / (perTenant * 2)).toFixed(1)} ms/request)`,
    );
    expect(elapsedMs).toBeLessThan(20000); // generous bound; the trace is the evidence
  });

  it('reuses tenant connections: a burst of reads stays fast after the first request', async () => {
    await totalTransactions(app, tokenA); // warm the connection
    await totalTransactions(app, tokenB);

    const timings: number[] = [];
    for (let i = 0; i < 20; i++) {
      const token = i % 2 === 0 ? tokenA : tokenB;
      const start = performance.now();
      await totalTransactions(app, token);
      timings.push(Math.round(performance.now() - start));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95) - 1] ?? 0;
    console.info(
      `[isolation-trace] alternating A/B reads: p95 = ${p95} ms, max = ${sorted[19]} ms`,
    );
    expect(p95).toBeLessThan(2000);
  });
});

describe('concurrency does not corrupt totals', () => {
  it('summary totals match the number of distinct successful writes', async () => {
    const before = await readSummary(app, tokenA);
    const events = Array.from({ length: 12 }, () => buildPayload({ amount: 500 }));

    // Every event is sent three times at once: 36 requests, 12 real payments.
    await Promise.all(
      events.flatMap((payload) =>
        [1, 2, 3].map(() => postTransaction(app, tokenA, { ...payload })),
      ),
    );

    const after = await readSummary(app, tokenA);
    expect(after.successfulTransactions).toBe(before.successfulTransactions + 12);
    expect(after.totalAmount).toBe(before.totalAmount + 12 * 500);
  });
});

describe('Redis failure (fail-safe behaviour)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('never creates a duplicate or half-written entry when Redis commands fail', async () => {
    const payload = buildPayload({ amount: 900 });
    const before = await readSummary(app, tokenA);

    // Every Redis command now fails like a dropped connection.
    const commands = Redis.prototype as unknown as Record<string, () => Promise<unknown>>;
    for (const name of ['set', 'get', 'del', 'eval', 'evalsha', 'exists']) {
      jest.spyOn(commands, name).mockRejectedValue(new Error('Connection is closed.'));
    }

    const outage = await postTransaction(app, tokenA, { ...payload });

    // Safe outcomes: refuse (503, fail closed) or process using the unique index alone (201).
    expect([LEDGER_STATUS.unavailable, LEDGER_STATUS.created]).toContain(outage.status);
    if (outage.status === LEDGER_STATUS.unavailable) {
      expect(outage.body.code).toBe(LEDGER_ERROR_CODES.serviceUnavailable);
    }

    jest.restoreAllMocks(); // Redis is back

    // The client retries with the same key: exactly one payment exists afterwards.
    const retry = await postTransaction(app, tokenA, { ...payload });
    expect([LEDGER_STATUS.created, LEDGER_STATUS.replayed]).toContain(retry.status);
    const after = await readSummary(app, tokenA);
    expect(after.successfulTransactions).toBe(before.successfulTransactions + 1);
    expect(after.totalAmount).toBe(before.totalAmount + 900);
  });
});

describe('lock expiry while work is still running', () => {
  it('the unique index still blocks a second writer when the lock was lost', async () => {
    const payload = buildPayload({ amount: 1300 });
    const before = await totalTransactions(app, tokenA);
    const lockKey = `lock:ledger:company_A:${payload.eventId}`;

    // Request 1 is in flight; its lock is wiped mid-way (simulates a TTL expiring under load).
    const first = postTransaction(app, tokenA, { ...payload });
    const redis = new Redis(process.env.REDIS_URL ?? '');
    await sleep(5);
    await redis.del(lockKey);
    // Request 2 now finds no lock and races the first request to the database.
    const second = postTransaction(app, tokenA, { ...payload });
    const [a, b] = await Promise.all([first, second]);
    redis.disconnect();

    for (const res of [a, b]) {
      expect([LEDGER_STATUS.created, LEDGER_STATUS.replayed, LEDGER_STATUS.conflict]).toContain(
        res.status,
      );
    }
    expect(await totalTransactions(app, tokenA)).toBe(before + 1); // still exactly one entry

    const winner = [a, b].find((r) => r.status === LEDGER_STATUS.created);
    if (winner) {
      const stored = await getTransaction(app, tokenA, createdData(winner).transactionId);
      expect(stored.status).toBe(200);
    }
  });
});
