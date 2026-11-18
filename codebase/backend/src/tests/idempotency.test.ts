import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import request from 'supertest';
import { createApp } from '../app';
import { acquireLock, releaseLock } from '../services/lock.service';
import {
  IDEMPOTENCY_HEADER,
  LEDGER_ERROR_CODES,
  LEDGER_ROUTES,
  LEDGER_STATUS,
  REPLAY_HEADER,
  isCreateTransactionResponse,
} from '../../../shared/contracts/ledger.contract';
import {
  buildPayload,
  createdData,
  expectError,
  getTransaction,
  postTransaction,
  tokenFor,
  totalTransactions,
  uniqueEventId,
} from './helpers/ledger.helpers';
import { createTestRedis, flushTestRedis, sleep } from './helpers/test-redis';

/**
 * Part 1 (Day 2): Redis connection and the distributed lock (Person 2's lock.service).
 * Interface under test is frozen in docs/api-contracts.md and docs/redis-locking.md:
 *   acquireLock(key, ttlMs): Promise<{ key, token } | null>
 *   releaseLock(lock): Promise<boolean>
 * Part 2 (Day 3): duplicate events through the real HTTP API.
 */
const app = createApp();
const tokenA = tokenFor('A');
const tokenB = tokenFor('B');

const uniqueKey = (): string => `lock:ledger:company_A:${randomUUID()}`;

let redis: Redis;

beforeAll(async () => {
  redis = createTestRedis();
  await redis.connect();
});

afterAll(async () => {
  await flushTestRedis();
  redis.disconnect();
});

describe('Redis connection', () => {
  it('answers PING', async () => {
    expect(await redis.ping()).toBe('PONG');
  });

  it('SET NX PX only succeeds for the first caller (the primitive the lock relies on)', async () => {
    const key = uniqueKey();
    expect(await redis.set(key, 'a', 'PX', 5000, 'NX')).toBe('OK');
    expect(await redis.set(key, 'b', 'PX', 5000, 'NX')).toBeNull();
    expect(await redis.get(key)).toBe('a');
  });
});

describe('distributed lock', () => {
  it('acquires a free lock and returns an ownership token', async () => {
    const key = uniqueKey();
    const lock = await acquireLock(key, 5000);
    expect(lock).not.toBeNull();
    expect(lock?.key).toBe(key);
    expect(typeof lock?.token).toBe('string');
    expect(lock?.token.length).toBeGreaterThanOrEqual(16);
    if (lock) await releaseLock(lock);
  });

  it('rejects a second acquisition while the lock is held', async () => {
    const key = uniqueKey();
    const first = await acquireLock(key, 5000);
    const second = await acquireLock(key, 5000);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
    if (first) await releaseLock(first);
  });

  it('gives every acquisition a different token', async () => {
    const a = await acquireLock(uniqueKey(), 5000);
    const b = await acquireLock(uniqueKey(), 5000);
    expect(a?.token).toBeDefined();
    expect(a?.token).not.toBe(b?.token);
    if (a) await releaseLock(a);
    if (b) await releaseLock(b);
  });

  it('lets the owner release, after which the lock can be taken again', async () => {
    const key = uniqueKey();
    const lock = await acquireLock(key, 5000);
    if (!lock) throw new Error('expected to acquire a free lock');
    expect(await releaseLock(lock)).toBe(true);
    expect(await redis.exists(key)).toBe(0);
    const again = await acquireLock(key, 5000);
    expect(again).not.toBeNull();
    if (again) await releaseLock(again);
  });

  it('does NOT release a lock when the token is not the owner token', async () => {
    const key = uniqueKey();
    const owner = await acquireLock(key, 5000);
    if (!owner) throw new Error('expected to acquire a free lock');

    const released = await releaseLock({ key, token: 'someone-elses-token' });

    expect(released).toBe(false);
    expect(await redis.get(key)).toBe(owner.token); // still held by the real owner
    await releaseLock(owner);
  });

  it('expires on its own after the TTL', async () => {
    const key = uniqueKey();
    const lock = await acquireLock(key, 200);
    expect(lock).not.toBeNull();
    await sleep(400);
    expect(await redis.exists(key)).toBe(0);
    const next = await acquireLock(key, 5000);
    expect(next).not.toBeNull();
    if (next) await releaseLock(next);
  });

  it('a stale owner cannot release the lock that a new owner now holds', async () => {
    const key = uniqueKey();
    const stale = await acquireLock(key, 150);
    if (!stale) throw new Error('expected to acquire a free lock');
    await sleep(300); // stale.token has expired

    const fresh = await acquireLock(key, 5000);
    if (!fresh) throw new Error('expected to acquire after expiry');

    expect(await releaseLock(stale)).toBe(false); // must not delete fresh's lock
    expect(await redis.get(key)).toBe(fresh.token);
    await releaseLock(fresh);
  });

  it('releasing an already-released lock is harmless', async () => {
    const lock = await acquireLock(uniqueKey(), 5000);
    if (!lock) throw new Error('expected to acquire a free lock');
    expect(await releaseLock(lock)).toBe(true);
    expect(await releaseLock(lock)).toBe(false);
  });

  it('only one of many simultaneous callers wins the lock', async () => {
    const key = uniqueKey();
    const results = await Promise.all(Array.from({ length: 25 }, () => acquireLock(key, 5000)));
    const winners = results.filter((lock) => lock !== null);
    expect(winners).toHaveLength(1);
    const winner = winners[0];
    if (winner) await releaseLock(winner);
  });
});

describe('POST /api/v1/ledger/transactions - idempotency', () => {
  it('processes a new event once and matches the response contract', async () => {
    const payload = buildPayload();
    const res = await postTransaction(app, tokenA, { ...payload });

    expect(res.status).toBe(LEDGER_STATUS.created);
    expect(isCreateTransactionResponse(res.body)).toBe(true);
    expect(res.body.data).toMatchObject({
      eventId: payload.eventId,
      status: 'COMPLETED',
      amount: payload.amount,
      currency: payload.currency,
    });
    expect(res.headers[REPLAY_HEADER.toLowerCase()]).toBeUndefined();
  });

  it('returns the original result when the same key and payload are sent again', async () => {
    const payload = buildPayload();
    const before = await totalTransactions(app, tokenA);

    const first = await postTransaction(app, tokenA, { ...payload });
    const retry = await postTransaction(app, tokenA, { ...payload }); // e.g. the response was lost

    expect(first.status).toBe(LEDGER_STATUS.created);
    expect(retry.status).toBe(LEDGER_STATUS.replayed);
    expect(retry.headers[REPLAY_HEADER.toLowerCase()]).toBe('true');
    expect(createdData(retry)).toEqual(createdData(first));
    expect(await totalTransactions(app, tokenA)).toBe(before + 1); // one entry, not two
  });

  it('keeps replaying the same result for repeated retries', async () => {
    const payload = buildPayload();
    const first = createdData(await postTransaction(app, tokenA, { ...payload }));
    for (let i = 0; i < 3; i++) {
      const retry = await postTransaction(app, tokenA, { ...payload });
      expect(retry.status).toBe(LEDGER_STATUS.replayed);
      expect(createdData(retry).transactionId).toBe(first.transactionId);
    }
  });

  it.each([
    ['a different amount', { amount: 2500 }],
    ['a different debit account', { debitAccount: 'customer_999' }],
    ['a different credit account', { creditAccount: 'merchant_999' }],
    ['a different currency', { currency: 'USD' }],
  ])('rejects the same key with %s (409) and leaves the original untouched', async (_n, change) => {
    const payload = buildPayload();
    const original = createdData(await postTransaction(app, tokenA, { ...payload }));
    const before = await totalTransactions(app, tokenA);

    const res = await postTransaction(app, tokenA, { ...payload, ...change });

    expectError(res, LEDGER_STATUS.conflict, LEDGER_ERROR_CODES.idempotencyConflict);
    expect(await totalTransactions(app, tokenA)).toBe(before);
    const stored = await getTransaction(app, tokenA, original.transactionId);
    expect(stored.body.data.amount).toBe(payload.amount);
    expect(stored.body.data.currency).toBe(payload.currency);
  });

  it('requires the Idempotency-Key header', async () => {
    const before = await totalTransactions(app, tokenA);
    const res = await postTransaction(app, tokenA, { ...buildPayload() }, { idempotencyKey: null });
    expectError(res, LEDGER_STATUS.validation, LEDGER_ERROR_CODES.idempotencyKeyRequired);
    expect(await totalTransactions(app, tokenA)).toBe(before);
  });

  it('rejects a header that differs from the body eventId', async () => {
    const before = await totalTransactions(app, tokenA);
    const res = await postTransaction(
      app,
      tokenA,
      { ...buildPayload() },
      { idempotencyKey: uniqueEventId('evt_other') },
    );
    expectError(res, LEDGER_STATUS.validation, LEDGER_ERROR_CODES.idempotencyKeyMismatch);
    expect(await totalTransactions(app, tokenA)).toBe(before);
  });

  it('treats a different eventId as a new transaction', async () => {
    const a = createdData(await postTransaction(app, tokenA, { ...buildPayload() }));
    const b = createdData(await postTransaction(app, tokenA, { ...buildPayload() }));
    expect(a.transactionId).not.toBe(b.transactionId);
    expect(a.eventId).not.toBe(b.eventId);
  });

  it('keeps the same eventId independent between Company A and Company B', async () => {
    const payload = buildPayload();
    const beforeA = await totalTransactions(app, tokenA);
    const beforeB = await totalTransactions(app, tokenB);

    const a = await postTransaction(app, tokenA, { ...payload });
    const b = await postTransaction(app, tokenB, { ...payload });

    expect(a.status).toBe(LEDGER_STATUS.created);
    expect(b.status).toBe(LEDGER_STATUS.created); // unique index is scoped to the tenant
    expect(createdData(a).transactionId).not.toBe(createdData(b).transactionId);
    expect(await totalTransactions(app, tokenA)).toBe(beforeA + 1);
    expect(await totalTransactions(app, tokenB)).toBe(beforeB + 1);
  });

  it('requires authentication before any idempotency work happens', async () => {
    const payload = buildPayload();
    const res = await request(app)
      .post(LEDGER_ROUTES.transactions)
      .set(IDEMPOTENCY_HEADER, payload.eventId)
      .send(payload);
    expect(res.status).toBe(401);
  });
});

describe('durable state is the source of truth, not Redis', () => {
  it('never reports COMPLETED just because a Redis hint says so', async () => {
    const payload = buildPayload();
    // A poisoned hint: Redis claims this event is done, but no ledger record exists.
    await redis.set(`idem:ledger:company_A:${payload.eventId}`, 'COMPLETED', 'PX', 10000);

    const res = await postTransaction(app, tokenA, { ...payload });

    expect([LEDGER_STATUS.created, LEDGER_STATUS.replayed]).toContain(res.status);
    const data = createdData(res);
    // Whatever was answered must be backed by a real, readable ledger record.
    const stored = await getTransaction(app, tokenA, data.transactionId);
    expect(stored.status).toBe(200);
    expect(stored.body.data.eventId).toBe(payload.eventId);
  });

  it('answers a still-locked event with a retryable 409, then succeeds once the lock expires', async () => {
    const payload = buildPayload();
    const lockKey = `lock:ledger:company_A:${payload.eventId}`;
    // Simulate another worker that crashed while holding the lock (TTL 600 ms).
    await redis.set(lockKey, 'crashed-worker-token', 'PX', 600, 'NX');
    const before = await totalTransactions(app, tokenA);

    const blocked = await postTransaction(app, tokenA, { ...payload });
    expectError(blocked, LEDGER_STATUS.conflict, LEDGER_ERROR_CODES.requestInProgress);
    expect(await totalTransactions(app, tokenA)).toBe(before);

    await sleep(900); // the stale lock expires by itself
    const retry = await postTransaction(app, tokenA, { ...payload });

    expect(retry.status).toBe(LEDGER_STATUS.created);
    expect(await totalTransactions(app, tokenA)).toBe(before + 1);
  });
});
