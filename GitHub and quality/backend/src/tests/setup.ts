import { generateKeyPairSync } from 'node:crypto';

/** Runs before every test file: throw-away RS256 keys + deterministic env. No secrets on disk. */
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

process.env.NODE_ENV = 'test';
process.env.JWT_PRIVATE_KEY = privateKey;
process.env.JWT_PUBLIC_KEY = publicKey;
process.env.JWT_ISSUER = 'ledgerguard';
process.env.SEED_USER_PASSWORD = 'password123';
process.env.FRONTEND_URL = 'http://localhost:5173';
