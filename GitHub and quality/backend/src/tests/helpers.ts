import { createHmac, generateKeyPairSync } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Response } from 'supertest';

export const PASSWORD = 'password123';
export const COMPANY_A = { email: 'admin@companyA.com', tenantId: 'company_A', id: 'user_001' };
export const COMPANY_B = { email: 'admin@companyB.com', tenantId: 'company_B', id: 'user_002' };

export interface Claims {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

export const validClaims: Claims = {
  sub: COMPANY_A.id,
  email: 'admin@companya.com',
  tenantId: COMPANY_A.tenantId,
  role: 'admin',
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Test setup missing ${name}`);
  return value;
}

const b64 = (value: object): string => Buffer.from(JSON.stringify(value)).toString('base64url');

/** A correctly signed RS256 token, with overridable claims/options for negative tests. */
export function signRs256(
  claims: Partial<Claims> & Record<string, unknown> = {},
  options: { privateKey?: string; issuer?: string; expired?: boolean } = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    ...validClaims,
    ...claims,
    iss: options.issuer ?? 'ledgerguard',
    iat: options.expired ? now - 120 : now,
    exp: options.expired ? now - 60 : now + 300,
  };
  return jwt.sign(payload, options.privateKey ?? requireEnv('JWT_PRIVATE_KEY'), {
    algorithm: 'RS256',
  });
}

export function foreignPrivateKey(): string {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  }).privateKey;
}

/** Unsigned token (alg: none). */
export function algNoneToken(claims: Partial<Claims> = {}): string {
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ ...validClaims, ...claims, iss: 'ledgerguard' })}.`;
}

/** Classic key-confusion attack: HS256 token "signed" with the RSA public key as the secret. */
export function hs256WithPublicKeyToken(): string {
  const head = b64({ alg: 'HS256', typ: 'JWT' });
  const body = b64({ ...validClaims, iss: 'ledgerguard' });
  const sig = createHmac('sha256', requireEnv('JWT_PUBLIC_KEY'))
    .update(`${head}.${body}`)
    .digest('base64url');
  return `${head}.${body}.${sig}`;
}

/** Re-use a real token's header+signature but swap the payload (tampering). */
export function tamperPayload(token: string, changes: Partial<Claims>): string {
  const [head, body, sig] = token.split('.');
  if (!head || !body || !sig) throw new Error('Not a JWT');
  const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as object;
  return `${head}.${b64({ ...decoded, ...changes })}.${sig}`;
}

export function setCookies(res: Response): string[] {
  const raw: unknown = res.headers['set-cookie'];
  if (Array.isArray(raw)) return raw.filter((c): c is string => typeof c === 'string');
  return typeof raw === 'string' ? [raw] : [];
}
