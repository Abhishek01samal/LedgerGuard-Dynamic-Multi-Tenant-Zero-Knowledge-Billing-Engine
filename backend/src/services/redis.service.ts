import { getRedis } from '../config/redis';

export async function redisGet(key: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;
  return redis.get(key);
}

export async function redisSetNxEx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  const result = await redis.set(key, value, { NX: true, EX: ttlSeconds });
  return result === 'OK';
}

export async function redisDel(key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(key);
}
