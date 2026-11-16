/**
 * Two Jest projects:
 *  - unit:        Week 1 tests. No MongoDB, no Redis. Fast. `npm run test:unit`
 *  - integration: Week 2 ledger/idempotency/transaction/concurrency tests. Needs the Docker
 *                 services (`docker compose up -d --wait` from the repo root).
 *                 `npm run test:integration`  (run with --runInBand --forceExit)
 */
const integrationTests = ['ledger', 'idempotency', 'transaction', 'concurrency'];

const base = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/tests/setup.ts'],
  clearMocks: true,
};

/** @type {import('jest').Config} */
module.exports = {
  // Global (applies to both projects): integration tests include deliberate sleeps and DB round-trips.
  testTimeout: 30000,
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**', '!src/server.ts'],
  projects: [
    {
      ...base,
      displayName: 'unit',
      testMatch: ['**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        ...integrationTests.map((name) => `/${name}\\.test\\.ts$`),
      ],
    },
    {
      ...base,
      displayName: 'integration',
      testMatch: integrationTests.map((name) => `**/${name}.test.ts`),
      globalSetup: '<rootDir>/src/tests/helpers/global-setup.ts',
      globalTeardown: '<rootDir>/src/tests/helpers/global-teardown.ts',
    },
  ],
};
