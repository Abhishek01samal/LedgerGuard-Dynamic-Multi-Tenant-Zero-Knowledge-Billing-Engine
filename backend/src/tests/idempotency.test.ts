import { randomUUID } from 'node:crypto';
import type Redis from 'ioredis';
import { acquireLock, releaseLock } from '../services/lock.service';
import { createTestRedis, flushTestRedis, sleep } from './helpers/test-redis';

/**
 * Day 2: Redis connection and the distributed lock (Person 2's lock.service).
 * Interface under test is frozen in docs/api-contracts.md and docs/redis-locking.md:
 *   acquireLock(key, ttlMs): Promise<{ key, token } | null>
 *   releaseLock(lock): Promise<boolean>
 * HTTP-level duplicate-event tests are added to this file on Day 3.
 */
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

/** Prepared on Day 2, implemented on Day 3 once POST /ledger/transactions is merged. */
describe('duplicate event cases (prepared)', () => {
  it.todo('same key + same payload twice returns the original result (200 + replay header)');
  it.todo('same key + different payload returns 409 IDEMPOTENCY_CONFLICT');
  it.todo('missing Idempotency-Key returns 400 IDEMPOTENCY_KEY_REQUIRED');
  it.todo('Idempotency-Key different from body eventId returns 400 IDEMPOTENCY_KEY_MISMATCH');
  it.todo('same eventId in Company A and Company B are independent transactions');
});
