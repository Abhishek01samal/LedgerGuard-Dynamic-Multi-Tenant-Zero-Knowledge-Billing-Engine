import { assertReplicaSet, getTestMongoUri } from './test-database';
import { assertRedisReachable, flushTestRedis, getTestRedisUrl } from './test-redis';

/**
 * Runs once before the integration project. Checks the infrastructure and points the app at it.
 * Jest workers inherit process.env, so createApp() sees these values.
 */
export default async function globalSetup(): Promise<void> {
  const mongoUri = getTestMongoUri();
  const redisUrl = getTestRedisUrl();

  await assertReplicaSet(mongoUri);
  await assertRedisReachable(redisUrl);
  await flushTestRedis(redisUrl); // no stale locks from a previous run

  process.env.MONGODB_MASTER_URI = mongoUri;
  process.env.REDIS_URL = redisUrl;
}
