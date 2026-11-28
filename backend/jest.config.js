/** Jest: ts-jest preset, node environment, RSA test env via setupFiles. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/modules/ledger/test-support/test-env.ts'],
};
