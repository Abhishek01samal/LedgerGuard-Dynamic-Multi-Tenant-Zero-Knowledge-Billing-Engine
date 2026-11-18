import Redis from 'ioredis';

/** Tests live in Redis database 15 so a dev session in database 0 is never touched. */
export const DEFAULT_TEST_REDIS_URL = 'redis://127.0.0.1:6379/15';

export function getTestRedisUrl(): string {
  return process.env.TEST_REDIS_URL ?? DEFAULT_TEST_REDIS_URL;
}

/** The database index in a redis:// URL (0 when absent). */
export function redisDatabaseIndex(url: string): number {
  const index = Number.parseInt(new URL(url).pathname.replace('/', ''), 10);
  return Number.isNaN(index) ? 0 : index;
}

/** FLUSHDB is destructive: refuse to run against database 0. */
export function assertSafeRedisUrl(url: string): void {
  if (redisDatabaseIndex(url) === 0) {
    throw new Error(
      `Refusing to use Redis database 0 for tests (${url}). Use a URL ending in /15, e.g. ${DEFAULT_TEST_REDIS_URL}`,
    );
  }
}

/** A client that fails fast instead of retrying forever. */
export function createTestRedis(url: string = getTestRedisUrl()): Redis {
  assertSafeRedisUrl(url);
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
  });
}

export async function assertRedisReachable(url: string = getTestRedisUrl()): Promise<void> {
  assertSafeRedisUrl(url);
  const client = createTestRedis(url);
  try {
    await client.connect();
    const reply = await client.ping();
    if (reply !== 'PONG') throw new Error(`Unexpected PING reply: ${reply}`);
  } catch (err) {
    throw new Error(
      `Cannot reach Redis at ${url}. Start it with "docker compose up -d --wait" from the repo ` +
        `root. (${err instanceof Error ? err.message : String(err)})`,
    );
  } finally {
    client.disconnect();
  }
}

/** Remove every key from the test database. Safe: refuses database 0. */
export async function flushTestRedis(url: string = getTestRedisUrl()): Promise<void> {
  assertSafeRedisUrl(url);
  const client = createTestRedis(url);
  try {
    await client.connect();
    await client.flushdb();
  } finally {
    client.disconnect();
  }
}

/** Resolve after `ms` milliseconds (lock-expiry tests). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
