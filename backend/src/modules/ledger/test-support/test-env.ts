/**
 * Import this FIRST in any test that touches code importing config/env.ts.
 * env.ts exits the process when RSA keys are missing; generated PEMs avoid that.
 */
import { generateKeyPairSync } from 'node:crypto';

process.env.NODE_ENV = 'test';

if (!process.env.JWT_PRIVATE_KEY || !process.env.JWT_PUBLIC_KEY) {
  const pair = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  process.env.JWT_PRIVATE_KEY = pair.privateKey;
  process.env.JWT_PUBLIC_KEY = pair.publicKey;
}

process.env.JWT_ISSUER ??= 'ledgerguard';
process.env.JWT_AUDIENCE ??= 'ledgerguard-api';
process.env.SEED_USER_PASSWORD = 'password123';
process.env.LEDGER_DEMO_FAIL_ACCOUNT = '__disabled_in_tests__';
