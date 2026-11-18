import { randomUUID } from 'node:crypto';
import Redis from 'ioredis';

/**
 * Distributed lock (frozen interface - docs/redis-locking.md).
 * Key is used exactly as given, no hidden prefix: callers build
 * `lock:ledger:{tenantId}:{eventId}` themselves.
 */
export interface Lock {
  key: string;
  token: string; // unique per acquisition
}

/** Compare-and-delete: only the owner token may remove the key. */
const RELEASE_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
else
  return 0
end`;

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    // Read at first use so the integration global setup (which points at the
    // db-15 test database) wins over the dev default.
    client = new Redis(process.env.REDIS_URL ?? 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: 1,
    });
    // Commands surface their own errors; this listener only keeps an
    // unhandled 'error' event from crashing the process.
    client.on('error', () => {});
  }
  return client;
}

/** Returns null when somebody else holds the lock. Never waits. */
export async function acquireLock(key: string, ttlMs: number): Promise<Lock | null> {
  const token = randomUUID();
  const result = await getClient().set(key, token, 'PX', ttlMs, 'NX');
  return result === 'OK' ? { key, token } : null;
}

/** True only when the stored token matched and the key was deleted. */
export async function releaseLock(lock: Lock): Promise<boolean> {
  try {
    const result = await getClient().eval(RELEASE_SCRIPT, 1, lock.key, lock.token);
    return result === 1;
  } catch {
    return false;
  }
}
