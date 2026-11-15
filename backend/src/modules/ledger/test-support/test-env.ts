/**
 * Import this FIRST in any test that touches code importing config/env.ts.
 * env.ts exits the process when RSA keys are missing; inline dummies avoid that.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY ??= 'test-private-key';
process.env.JWT_PUBLIC_KEY ??= 'test-public-key';
// Pin the demo-failure switch so tests never depend on a developer's local .env.
process.env.LEDGER_DEMO_FAIL_ACCOUNT = '__disabled_in_tests__';
