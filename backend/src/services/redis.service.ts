import Redis from 'ioredis';
import { getRedisConfig } from '../config/redis';

/** Thrown whenever Redis cannot be reached or a command fails. Callers decide what to do. */
export class RedisUnavailableError extends Error {
  readonly originalError?: unknown;
  constructor(message = 'Redis is unavailable', originalError?: unknown) {
    super(message);
    this.name = 'RedisUnavailableError';
    this.originalError = originalError;
  }
}

/** Never print credentials from a connection string. */
export function redactRedisUrl(url: string): string {
  return url.replace(/\/\/[^@/]*@/, '//***@');
}

let client: Redis | null = null;
let connecting: Promise<void> | null = null;

export function getRedisClient(): Redis {
  if (client) return client;
  const config = getRedisConfig();
  const created = new Redis(config.url, {
    lazyConnect: true,
    connectTimeout: config.connectTimeoutMs,
    commandTimeout: config.commandTimeoutMs,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
  });
  // Without a listener an "error" event would crash the process.
  created.on('error', (err: Error) => {
    console.warn(`[redis] ${err.message} (${redactRedisUrl(config.url)})`);
  });
  client = created;
  return created;
}

/** A connected client, or RedisUnavailableError. */
export async function getRedis(): Promise<Redis> {
  const redis = getRedisClient();
  if (redis.status === 'ready') return redis;
  if (redis.status === 'wait') {
    connecting ??= redis.connect().finally(() => {
      connecting = null;
    });
    try {
      await connecting;
    } catch (err) {
      throw new RedisUnavailableError('Cannot connect to Redis', err);
    }
    return redis;
  }
  throw new RedisUnavailableError(`Redis is not ready (status: ${redis.status})`);
}
