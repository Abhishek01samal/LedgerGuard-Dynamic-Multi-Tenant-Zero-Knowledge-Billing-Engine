/**
 * Week 1 helpers keep their old import path: `import { signRs256 } from './helpers'`.
 * Infra helpers are imported explicitly by the integration tests only, so the fast unit tests
 * never load mongoose or ioredis:
 *   import { getTestMongoUri } from './helpers/test-database';
 *   import { createTestRedis } from './helpers/test-redis';
 * (Delete the old backend/src/tests/helpers.ts - its content moved to ./auth.helpers.)
 */
export * from './auth.helpers';
