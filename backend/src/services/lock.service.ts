import { randomUUID } from 'node:crypto';
import { getRedis } from '../config/redis';
import { LockUnavailableError } from '../modules/ledger/ledger.errors';
import { InMemoryIdempotencyGuard } from '../modules/ledger/ledger.guard';
import type { IdempotencyGuard } from '../modules/ledger/ledger.types';

const UNLOCK_LUA = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export interface RedisLockOptions {
  ttlMs?: number;
  waitMs?: number;
  retryDelayMs?: number;
}

/**
 * Distributed lock used as Person 1's IdempotencyGuard.
 * SET key token NX PX ttl, release with compare-and-delete.
 */
export class RedisIdempotencyGuard implements IdempotencyGuard {
  private readonly fallback = new InMemoryIdempotencyGuard();

  constructor(private readonly options: RedisLockOptions = {}) {}

  async runExclusive<T>(lockKey: string, work: () => Promise<T>): Promise<T> {
    const redis = getRedis();
    if (!redis) return this.fallback.runExclusive(lockKey, work);

    const ttlMs = this.options.ttlMs ?? 10_000;
    const waitMs = this.options.waitMs ?? 2_000;
    const retryDelayMs = this.options.retryDelayMs ?? 50;
    const token = randomUUID();
    const redisKey = `lock:${lockKey}`;
    const deadline = Date.now() + waitMs;

    let acquired = false;
    while (Date.now() <= deadline) {
      const result = await redis.set(redisKey, token, { NX: true, PX: ttlMs });
      if (result === 'OK') {
        acquired = true;
        break;
      }
      await sleep(retryDelayMs);
    }

    if (!acquired) throw new LockUnavailableError();

    try {
      return await work();
    } finally {
      await redis.eval(UNLOCK_LUA, { keys: [redisKey], arguments: [token] }).catch(() => undefined);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
