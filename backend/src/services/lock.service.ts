import { randomBytes } from 'node:crypto';
import { getRedis, RedisUnavailableError } from './redis.service';

/**
 * Distributed lock (Person 2). Coordination only: the MongoDB unique index stays authoritative.
 * Interface frozen in docs/api-contracts.md and tested by backend/src/tests/idempotency.test.ts.
 */
export interface Lock {
  key: string;
  /** Unique per acquisition. Only the holder of this token can release the lock. */
  token: string;
}

/** Compare-and-delete in one atomic step, so a stale owner can never delete a newer lock. */
const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end
`;

/** lock:ledger:{tenantId}:{eventId} (tenant ids come from the verified JWT, never the client). */
export function ledgerLockKey(tenantId: string, eventId: string): string {
  return `lock:ledger:${tenantId}:${eventId}`;
}

/** The key is used exactly as given. Returns null when someone else holds the lock. */
export async function acquireLock(key: string, ttlMs: number): Promise<Lock | null> {
  if (!key) throw new TypeError('Lock key must not be empty');
  if (!Number.isInteger(ttlMs) || ttlMs <= 0) {
    throw new TypeError('Lock ttl must be a positive integer (milliseconds)');
  }
  const redis = await getRedis();
  const token = randomBytes(16).toString('hex');
  try {
    const reply = await redis.set(key, token, 'PX', ttlMs, 'NX');
    return reply === 'OK' ? { key, token } : null;
  } catch (err) {
    throw new RedisUnavailableError('Could not acquire the lock', err);
  }
}

/** True only if the token still matched and the lock was deleted. */
export async function releaseLock(lock: Lock): Promise<boolean> {
  const redis = await getRedis();
  try {
    const result = await redis.eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
    return result === 1;
  } catch (err) {
    throw new RedisUnavailableError('Could not release the lock', err);
  }
}
