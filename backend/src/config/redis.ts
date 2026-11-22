/**
 * Redis and idempotency settings (Person 2). Read from the environment at call time.
 *   REDIS_URL               redis://127.0.0.1:6379
 *   LEDGER_LOCK_TTL_MS      how long a processing lock lives (default 10000)
 *   LEDGER_LOCK_WAIT_MS     how long a request waits for a busy event to finish (default 0)
 */
const DEFAULT_URL = 'redis://127.0.0.1:6379';

export interface RedisConfig {
  url: string;
  connectTimeoutMs: number;
  commandTimeoutMs: number;
  lockTtlMs: number;
  lockWaitMs: number;
}

function positiveInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInt(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
}

export function getRedisConfig(): RedisConfig {
  const url = process.env.REDIS_URL?.trim() || DEFAULT_URL;
  if (!/^rediss?:\/\//.test(url)) {
    throw new Error('REDIS_URL must start with redis:// or rediss://');
  }
  return {
    url,
    connectTimeoutMs: positiveInt('REDIS_CONNECT_TIMEOUT_MS', 2000),
    commandTimeoutMs: positiveInt('REDIS_COMMAND_TIMEOUT_MS', 2000),
    lockTtlMs: positiveInt('LEDGER_LOCK_TTL_MS', 10000),
    lockWaitMs: nonNegativeInt('LEDGER_LOCK_WAIT_MS', 0),
  };
}
