import { createClient } from 'redis';
import { env } from './env';

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;

/** Connect in the background: a missing Redis must never block API startup. */
export function connectRedis(): void {
  if (!env.redisUrl || client) return;

  const next = createClient({ url: env.redisUrl, socket: { connectTimeout: 2_000 } });
  next.on('error', (err: Error) => {
    console.error('[redis] client error', err.message);
  });
  next.on('connect', () => {
    client = next;
  });
  next.on('end', () => {
    if (client === next) client = null;
  });

  void next.connect().catch((err: unknown) => {
    console.error('[redis] initial connection failed; using in-process fallback', err);
  });
}

export function getRedis(): RedisClient | null {
  return client?.isOpen ? client : null;
}

export async function closeRedis(): Promise<void> {
  const current = client;
  client = null;
  if (!current) return;
  await current.quit().catch(() => current.disconnect().catch(() => undefined));
}
