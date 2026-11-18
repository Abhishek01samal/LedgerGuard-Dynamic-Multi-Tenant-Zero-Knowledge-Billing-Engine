import { flushTestRedis, getTestRedisUrl } from './test-redis';

/** Leave Redis clean so the next run (or a developer) starts without stale locks. */
export default async function globalTeardown(): Promise<void> {
  await flushTestRedis(getTestRedisUrl());
}
